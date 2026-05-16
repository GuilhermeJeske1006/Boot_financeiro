const Anthropic = require('@anthropic-ai/sdk');
const TOOLS = require('./tools/registry');
const ToolExecutor = require('./tool_executor');
const ConversationStore = require('./conversation_store');
const { buildSystemPrompt } = require('./prompts');
const SubscriptionService = require('../../services/subscription_service');
const UserRepository = require('../../repositories/user_respository');

const client = new Anthropic();

// Tools que exigem confirmação explícita antes de executar
const REQUIRES_CONFIRMATION = new Set([
  'delete_transaction',
  'edit_transaction',
  'create_recurring_transaction',
  'delete_recurring_transaction',
  'set_budget',
  'export_report',
]);

// Tools de escrita que mudam estado no DB
const WRITE_TOOLS = new Set([
  'create_transaction',
  'create_goal',
  'contribute_to_goal',
  'update_profile',
  ...Array.from(REQUIRES_CONFIRMATION),
]);

// Tools bloqueadas no plano Free
const PRO_ONLY = new Set([
  'create_recurring_transaction',
  'list_recurring_transactions',
  'delete_recurring_transaction',
  'set_budget',
  'list_budgets',
  'export_report',
]);

// Máximo de iterações do agentic loop para evitar loop infinito
const MAX_ITERATIONS = 5;

// Palavras que o usuário digita para confirmar ação pendente
const CONFIRM_WORDS = new Set(['confirmar', 'confirma', 'sim', 's', 'yes', 'ok', 'pode', 'vai']);
const CANCEL_WORDS = new Set(['cancelar', 'cancela', 'não', 'nao', 'n', 'no', 'voltar', 'para']);

function sanitizeInput(text) {
  const patterns = [
    /\[SYSTEM\]/gi, /\[INST\]/gi, /<\|system\|>/gi,
    /ignore.*instructions/gi, /new instructions:/gi,
    /you are now/gi, /act as/gi,
  ];
  let clean = text;
  patterns.forEach(p => { clean = clean.replace(p, '[REMOVED]'); });
  return clean.slice(0, 2000);
}

class AgentOrchestrator {
  async process(userId, rawMessage) {
    if (!process.env.ANTHROPIC_API_KEY) {
      return '⚠️ *IA não configurada.* Fale com o suporte.\n\n_Digite *menu* para usar o bot com menus._';
    }

    const userMessage = sanitizeInput(rawMessage);

    // Verifica se há ação pendente de confirmação
    const pending = ConversationStore.getPending(userId);
    if (pending) {
      return await this._handleConfirmation(userId, userMessage, pending);
    }

    const [user, sub] = await Promise.all([
      UserRepository.findById(userId),
      SubscriptionService.getMySubscription(userId).catch(() => null),
    ]);

    const isPro = sub?.plan?.name !== 'free';
    const today = new Date().toISOString().split('T')[0];
    const systemPrompt = buildSystemPrompt(today, isPro, user?.name);

    const history = await ConversationStore.getHistory(userId);
    const messages = [...history, { role: 'user', content: userMessage }];

    try {
      const finalText = await this._runAgentLoop(userId, systemPrompt, messages, isPro);
      await ConversationStore.append(userId, 'user', userMessage);
      await ConversationStore.append(userId, 'assistant', finalText);
      return finalText;
    } catch (err) {
      console.error(`[AgentOrchestrator] userId=${userId}:`, err.message);
      return this._buildErrorMessage(err);
    }
  }

  async _runAgentLoop(userId, systemPrompt, messages, isPro) {
    let iterations = 0;
    let currentMessages = [...messages];
    let mediaResult = null;
    let writeToolExecuted = false;

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        tools: TOOLS,
        messages: currentMessages,
      });

      if (response.stop_reason === 'end_turn') {
        const text = response.content
          .filter(b => b.type === 'text')
          .map(b => b.text)
          .join('\n')
          .trim();

        // Safety net: se nenhuma write tool foi chamada mas resposta simula sucesso,
        // re-injeta um lembrete para forçar o tool call (só na primeira iteração)
        if (iterations === 1 && !writeToolExecuted && this._isFalseSuccess(text)) {
          currentMessages = [
            ...currentMessages,
            { role: 'assistant', content: response.content },
            {
              role: 'user',
              content: 'SISTEMA: Você confirmou uma ação mas não chamou nenhuma tool. Os dados NÃO foram salvos. Execute create_transaction (ou a tool correspondente) agora para registrar de verdade.',
            },
          ];
          continue;
        }

        if (mediaResult) {
          // Sinaliza mídia para o handler devolver como arquivo
          return { __media: mediaResult, text: text || '✅ Arquivo gerado!' };
        }
        return text || '✅ Feito!';
      }

      if (response.stop_reason !== 'tool_use') break;

      const toolResults = [];

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        const { id, name, input } = block;

        // Verificação de plano Pro
        if (PRO_ONLY.has(name) && !isPro) {
          await ConversationStore.logAction(userId, name, input, { blocked: 'plan_restriction' }, false);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: id,
            content: JSON.stringify({
              error: 'PLAN_RESTRICTION',
              message: 'Esta funcionalidade requer o plano Pro. Use "meu plano" para ver opções de upgrade.',
            }),
          });
          continue;
        }

        // Gate de confirmação para ações destrutivas
        if (REQUIRES_CONFIRMATION.has(name)) {
          const summary = ToolExecutor.summarizeAction(name, input);
          ConversationStore.setPending(userId, name, input);

          return (
            `⚠️ *Confirmação necessária:*\n\n` +
            `${summary}\n\n` +
            `Digite *confirmar* para prosseguir ou *cancelar* para desistir.`
          );
        }

        // Executa a tool
        if (WRITE_TOOLS.has(name)) writeToolExecuted = true;
        const result = await ToolExecutor.execute(userId, name, input);
        await ConversationStore.logAction(userId, name, input, result, false);

        // Captura mídia (PDF/Excel) para devolver ao handler
        if (result.media) {
          mediaResult = result.media;
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: id,
          content: JSON.stringify(
            result.media ? { success: true, message: result.message } : result
          ),
        });
      }

      currentMessages = [
        ...currentMessages,
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults },
      ];
    }

    return '⚠️ Não consegui processar sua solicitação. Tente reformular ou use *menu* para o bot tradicional.';
  }

  async _handleConfirmation(userId, userMessage, pending) {
    const lower = userMessage.toLowerCase().trim();

    if (CANCEL_WORDS.has(lower)) {
      ConversationStore.clearPending(userId);
      await ConversationStore.append(userId, 'user', userMessage);
      await ConversationStore.append(userId, 'assistant', '❌ Ação cancelada.');
      return '❌ Ação cancelada.';
    }

    if (CONFIRM_WORDS.has(lower)) {
      ConversationStore.clearPending(userId);

      const result = await ToolExecutor.execute(userId, pending.tool, pending.input);
      await ConversationStore.logAction(userId, pending.tool, pending.input, result, true);

      // Ação foi confirmada — se tem mídia, sinaliza para o handler
      if (result.media) {
        const reply = result.message || '✅ Arquivo gerado!';
        await ConversationStore.append(userId, 'user', userMessage);
        await ConversationStore.append(userId, 'assistant', reply);
        return { __media: result.media, text: reply };
      }

      if (result.error) {
        const reply = `❌ Erro: ${result.error}`;
        await ConversationStore.append(userId, 'user', userMessage);
        await ConversationStore.append(userId, 'assistant', reply);
        return reply;
      }

      const reply = result.message || '✅ Ação executada com sucesso!';
      await ConversationStore.append(userId, 'user', userMessage);
      await ConversationStore.append(userId, 'assistant', reply);
      return reply;
    }

    // Usuário digitou algo diferente — pede que confirme ou cancele
    return (
      `⚠️ *Aguardando confirmação.*\n\n` +
      `Digite *confirmar* para prosseguir ou *cancelar* para desistir.`
    );
  }

  _buildErrorMessage(err) {
    const msg = err.message || '';
    if (msg.includes('credit balance is too low') || msg.includes('insufficient')) {
      return (
        `⚠️ *Saldo insuficiente na conta Anthropic.*\n\n` +
        `O modo Chat está temporariamente indisponível.\n\n` +
        `_Digite *menu* para usar o bot com menus._`
      );
    }
    if (msg.includes('rate_limit') || msg.includes('overloaded')) {
      return (
        `⚠️ *IA temporariamente sobrecarregada.* Tente novamente em alguns segundos.\n\n` +
        `_Digite *menu* para usar o bot com menus enquanto isso._`
      );
    }
    return (
      `⚠️ *Erro ao processar.* Tente novamente.\n\n` +
      `_Digite *menu* para usar o bot com menus._`
    );
  }

  _isFalseSuccess(text) {
    if (!text) return false;
    const lower = text.toLowerCase();
    const hasSuccessSignal = text.includes('✅') || lower.includes('tudo certo') || lower.includes('feito');
    const hasWriteVerb = /registrad|anotad|salv[oa]|adicionad|cri(ad|ei)|remov|atualiz|contribu/.test(lower);
    return hasSuccessSignal && hasWriteVerb;
  }

  // Limpa histórico conversacional de um usuário
  async clearHistory(userId) {
    await ConversationStore.clearHistory(userId);
    ConversationStore.clearPending(userId);
  }
}

module.exports = new AgentOrchestrator();
