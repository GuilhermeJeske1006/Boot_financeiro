const Anthropic = require('@anthropic-ai/sdk');
const TransactionService = require('../../services/transaction_service');
const CategoryRepository = require('../../repositories/category_repository');
const ReportService = require('../../services/report_service');
const SubscriptionService = require('../../services/subscription_service');
const UserRepository = require('../../repositories/user_respository');

const client = new Anthropic();

const SYSTEM_PROMPT = `Você é um assistente financeiro. Analise a mensagem do usuário e extraia informações de uma transação financeira ou solicitação de saldo.

Responda APENAS com um JSON válido, sem texto adicional, no formato:
{
  "intent": "expense" | "income" | "balance" | "unknown",
  "amount": number | null,
  "category": string | null,
  "description": string | null,
  "date": "YYYY-MM-DD" | null
}

Regras:
- "expense": saída de dinheiro (gasto, despesa, paguei, comprei, etc.)
- "income": entrada de dinheiro (recebi, salário, vendi, etc.)
- "balance": pedido de saldo/resumo financeiro
- "unknown": qualquer outra coisa não relacionada a finanças
- Para datas relativas como "hoje", "ontem", use a data atual fornecida no contexto
- Se a data não for mencionada, use null (assumirá hoje)
- Normalize valores: "50 reais" → 50, "1.500" → 1500, "R$ 89,90" → 89.90
- Se não houver valor claro para intent expense/income, use intent "unknown"`;

class AiInterpreter {
  constructor() {
    // Histórico de contexto por userId: Map<userId, [{ role, content }]>
    this.contextHistory = new Map();
  }

  // Tenta interpretar mensagem de linguagem natural. Retorna resposta ou null se não reconhecido.
  async handle(userId, input) {
    if (!process.env.ANTHROPIC_API_KEY) return null;

    const user = await UserRepository.findById(userId);
    if (!user || !user.ai_enabled) return null;

    try {
      return await this._process(userId, input, user);
    } catch (err) {
      return null;
    }
  }

  // Interpreta sem checar ai_enabled (usado no modo chat da sessão)
  // Retorna string de erro amigável em vez de null para falhas de API
  async interpret(userId, input) {
    if (!process.env.ANTHROPIC_API_KEY) {
      return `⚠️ *IA não configurada.* Variável ANTHROPIC_API_KEY ausente.`;
    }

    const user = await UserRepository.findById(userId);
    if (!user) return null;

    try {
      return await this._process(userId, input, user);
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('credit balance is too low') || msg.includes('insufficient')) {
        return (
          `⚠️ *Saldo insuficiente na conta Anthropic.*\n\n` +
          `O modo Chat está temporariamente indisponível.\n` +
          `Acesse *Plans & Billing* na Anthropic para recarregar créditos.\n\n` +
          `_Digite *menu* para usar o bot com menus._`
        );
      }
      return (
        `⚠️ *Erro ao conectar com a IA.* Tente novamente em instantes.\n\n` +
        `_Digite *menu* para usar o bot com menus._`
      );
    }
  }

  async _process(userId, input, user) {
    // Só interpreta mensagens que parecem texto livre (não números, não comandos /x)
    if (/^\d+$/.test(input.trim())) return null;
    if (input.trim().startsWith('/')) return null;
    const lower = input.toLowerCase().trim();
    if (['sair', 'menu', 's', 'n'].includes(lower)) return null;

    const contextLength = user.ai_context_length || 0;
    const history = contextLength > 0
      ? (this.contextHistory.get(userId) || []).slice(-contextLength)
      : [];

    let parsed;
    try {
      const today = new Date().toISOString().split('T')[0];
      const userMessage = `Data atual: ${today}\nMensagem: ${input}`;
      const messages = [...history, { role: 'user', content: userMessage }];

      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: SYSTEM_PROMPT,
        messages,
      });

      let text = response.content[0].text.trim();
      // Remove markdown code block se o modelo retornar ```json ... ```
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      console.log(`[AiInterpreter] userId=${userId} input="${input}" response=${text}`);
      parsed = JSON.parse(text);

      if (contextLength > 0) {
        const existing = this.contextHistory.get(userId) || [];
        const updated = [
          ...existing,
          { role: 'user', content: userMessage },
          { role: 'assistant', content: text },
        ].slice(-contextLength * 2);
        this.contextHistory.set(userId, updated);
      }
    } catch (err) {
      // Tenta extrair a mensagem legível do corpo JSON do erro da Anthropic
      let errMsg = err.message || String(err);
      try {
        const jsonStart = errMsg.indexOf('{');
        if (jsonStart !== -1) {
          const body = JSON.parse(errMsg.slice(jsonStart));
          errMsg = body?.error?.message || errMsg;
        }
      } catch (_) { /* mantém errMsg original */ }

      console.error(`[AiInterpreter] userId=${userId} input="${input}" → ${errMsg}`);
      throw err;
    }

    if (!parsed || parsed.intent === 'unknown') {
      console.log(`[AiInterpreter] userId=${userId} intent desconhecido ou nulo, ignorando.`);
      return null;
    }

    if (parsed.intent === 'balance') {
      return await this._handleBalance(userId);
    }

    if ((parsed.intent === 'income' || parsed.intent === 'expense') && parsed.amount) {
      return await this._handleTransaction(userId, parsed);
    }

    return null;
  }

  async _handleBalance(userId) {
    const now = new Date();
    const totals = await ReportService.getMonthTotals(now.getFullYear(), now.getMonth() + 1, userId);
    const emoji = totals.balance >= 0 ? '🤑' : '😰';
    const sign = totals.balance >= 0 ? '+' : '-';
    return [
      `💰 *Saldo do Mês*`,
      ``,
      `📈 Receitas: R$ ${totals.totalIncome.toFixed(2)}`,
      `📉 Despesas: R$ ${totals.totalExpense.toFixed(2)}`,
      `━━━━━━━━`,
      `${emoji} Saldo: ${sign} R$ ${Math.abs(totals.balance).toFixed(2)}`,
      ``,
      `_Para detalhes, envie *5* no menu._`,
    ].join('\n');
  }

  async _handleTransaction(userId, parsed) {
    const canCreate = await SubscriptionService.canCreateTransaction(userId);
    if (!canCreate) return null; // deixa o menu normal mostrar o aviso de limite

    const { intent: type, amount, category: categorySearch, description, date } = parsed;
    const categories = await CategoryRepository.findByType(type, userId);

    let category = null;
    if (categorySearch) {
      const search = categorySearch.toLowerCase();
      category = categories.find(c => c.name.toLowerCase().includes(search));
    }
    if (!category && categories.length > 0) {
      category = categories[0];
    }
    if (!category) return null;

    const transactionDate = date || new Date().toISOString().split('T')[0];
    await TransactionService.create({
      type,
      amount,
      description: description || null,
      category_id: category.id,
      user_id: userId,
      date: transactionDate,
    });

    const typeEmoji = type === 'income' ? '📈' : '📉';
    const typeLabel = type === 'income' ? 'Entrada' : 'Saída';
    const dateFormatted = new Date(transactionDate + 'T12:00:00').toLocaleDateString('pt-BR');

    return [
      `🤖 *${typeLabel} interpretada e registrada!*`,
      ``,
      `${typeEmoji} R$ ${amount.toFixed(2)}`,
      `🏷️ Categoria: ${category.name}`,
      description ? `📝 Descrição: ${description}` : null,
      `📅 Data: ${dateFormatted}`,
      ``,
      `💡 _Use /ajuda para ver atalhos rápidos._`,
    ].filter(Boolean).join('\n');
  }
}

module.exports = new AiInterpreter();
