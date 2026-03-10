const Anthropic = require('@anthropic-ai/sdk');
const Groq = require('groq-sdk');
const TransactionService = require('../../services/transaction_service');
const CategoryRepository = require('../../repositories/category_repository');
const ReportService = require('../../services/report_service');
const SubscriptionService = require('../../services/subscription_service');
const UserRepository = require('../../repositories/user_respository');

const client = new Anthropic();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const BASE_SYSTEM_PROMPT = `Você é um assistente financeiro. Analise a mensagem do usuário e extraia informações de uma transação financeira ou solicitação de saldo.

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
- Se não houver valor claro para intent expense/income, use intent "unknown"
- O campo "category" DEVE ser exatamente um dos nomes da lista de categorias fornecida abaixo. Escolha a mais adequada ao contexto.`;

function buildSystemPrompt(expenseCategories, incomeCategories) {
  const expenseList = expenseCategories.map(c => `  - ${c.name}`).join('\n') || '  (nenhuma)';
  const incomeList = incomeCategories.map(c => `  - ${c.name}`).join('\n') || '  (nenhuma)';
  return `${BASE_SYSTEM_PROMPT}

Categorias disponíveis para despesas (use quando intent="expense"):
${expenseList}

Categorias disponíveis para receitas (use quando intent="income"):
${incomeList}`;
}

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
  async interpret(userId, input, companyId = null) {
    if (!process.env.ANTHROPIC_API_KEY) {
      return `⚠️ *IA não configurada.* Variável ANTHROPIC_API_KEY ausente.`;
    }

    const user = await UserRepository.findById(userId);
    if (!user) return null;

    try {
      return await this._process(userId, input, user, companyId);
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

  // Apenas parseia a intenção sem criar transação (para uso no modo chat multi-empresa)
  async parseIntent(userId, input) {
    if (/^\d+$/.test(input.trim())) return null;
    if (input.trim().startsWith('/')) return null;
    const lower = input.toLowerCase().trim();
    if (['sair', 'menu', 's', 'n', 'trocar'].includes(lower)) return null;

    const user = await UserRepository.findById(userId);
    if (!user) return null;

    const [expenseCategories, incomeCategories] = await Promise.all([
      CategoryRepository.findByType('expense', userId),
      CategoryRepository.findByType('income', userId),
    ]);
    const systemPrompt = buildSystemPrompt(expenseCategories, incomeCategories);

    try {
      const today = new Date().toISOString().split('T')[0];
      const userMessage = `Data atual: ${today}\nMensagem: ${input}`;
      const contextLength = user.ai_context_length || 0;
      const history = contextLength > 0
        ? (this.contextHistory.get(userId) || []).slice(-contextLength)
        : [];

      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: systemPrompt,
        messages: [...history, { role: 'user', content: userMessage }],
      });

      let text = response.content[0].text.trim();
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      return JSON.parse(text);
    } catch (err) {
      return null;
    }
  }

  // Executa uma transação a partir de um intent já parseado (usado após seleção de empresa)
  async executeTransaction(userId, parsed, companyId = null) {
    return await this._handleTransaction(userId, parsed, companyId);
  }

  // Transcreve áudio e interpreta como financeiro (usado no modo chat)
  async interpretAudio(userId, audioBase64, mimeType) {
    if (!process.env.ANTHROPIC_API_KEY) {
      return `⚠️ *IA não configurada.* Variável ANTHROPIC_API_KEY ausente.`;
    }

    const user = await UserRepository.findById(userId);
    if (!user) return null;

    try {
      const transcription = await this._transcribeAudio(audioBase64, mimeType);
      if (!transcription) {
        return `⚠️ Não consegui transcrever o áudio. Tente enviar como texto.`;
      }

      console.log(`[AiInterpreter] userId=${userId} audio transcription="${transcription}"`);

      const result = await this._process(userId, transcription, user);
      if (result) return result;

      return (
        `🎤 _"${transcription}"_\n\n` +
        `🤖 Não entendi como uma transação financeira. Tente algo como:\n\n` +
        `• _"Gastei 80 reais em combustível"_\n` +
        `• _"Recebi 1500 de freelance"_\n` +
        `• _"Qual meu saldo?"_\n\n` +
        `_Digite *menu* para usar o bot com menus ou *sair* para encerrar._`
      );
    } catch (err) {
      console.error(`[AiInterpreter] interpretAudio userId=${userId} → ${err.message}`);
      return `⚠️ Erro ao processar áudio. Tente enviar a mensagem como texto.`;
    }
  }

  async _transcribeAudio(audioBase64, mimeType) {
    const extMap = {
      'audio/ogg': 'ogg', 'audio/mp4': 'mp4', 'audio/wav': 'wav',
      'audio/mp3': 'mp3', 'audio/mpeg': 'mp3', 'audio/webm': 'webm', 'audio/flac': 'flac',
    };
    const ext = Object.entries(extMap).find(([k]) => mimeType.startsWith(k))?.[1] || 'ogg';
    const buffer = Buffer.from(audioBase64, 'base64');
    const file = new File([buffer], `audio.${ext}`, { type: mimeType });

    const response = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3-turbo',
      language: 'pt',
    });

    return response.text?.trim() || null;
  }

  async _process(userId, input, user, companyId = null) {
    // Só interpreta mensagens que parecem texto livre (não números, não comandos /x)
    if (/^\d+$/.test(input.trim())) return null;
    if (input.trim().startsWith('/')) return null;
    const lower = input.toLowerCase().trim();
    if (['sair', 'menu', 's', 'n'].includes(lower)) return null;

    const contextLength = user.ai_context_length || 0;
    const history = contextLength > 0
      ? (this.contextHistory.get(userId) || []).slice(-contextLength)
      : [];

    const [expenseCategories, incomeCategories] = await Promise.all([
      CategoryRepository.findByType('expense', userId),
      CategoryRepository.findByType('income', userId),
    ]);
    const systemPrompt = buildSystemPrompt(expenseCategories, incomeCategories);

    let parsed;
    try {
      const today = new Date().toISOString().split('T')[0];
      const userMessage = `Data atual: ${today}\nMensagem: ${input}`;
      const messages = [...history, { role: 'user', content: userMessage }];

      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: systemPrompt,
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
      return await this._handleTransaction(userId, parsed, companyId);
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

  async _handleTransaction(userId, parsed, companyId = null) {
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
    const transactionData = {
      type,
      amount,
      description: description || null,
      category_id: category.id,
      date: transactionDate,
    };
    if (companyId) {
      transactionData.company_id = companyId;
    } else {
      transactionData.user_id = userId;
    }
    await TransactionService.create(transactionData);

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

  clearContext(userId) {
    this.contextHistory.delete(userId);
  }
}

module.exports = new AiInterpreter();
