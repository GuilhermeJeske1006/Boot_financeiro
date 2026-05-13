const { AiConversation, AiActionsLog } = require('../../models');

// Pending actions aguardando confirmação: Map<userId, { tool, input, createdAt }>
const pendingMap = new Map();
const PENDING_TTL_MS = 5 * 60 * 1000; // 5 minutos

// Mantém no máximo esse número de pares user/assistant por usuário
const MAX_HISTORY_PAIRS = 20;
const HISTORY_WINDOW = 10; // pares a enviar para o modelo

const ConversationStore = {
  async getHistory(userId) {
    const rows = await AiConversation.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit: HISTORY_WINDOW * 2,
    });
    return rows.reverse().map(r => ({ role: r.role, content: r.content }));
  },

  async append(userId, role, content) {
    await AiConversation.create({ user_id: userId, role, content });

    // Pruning assíncrono para não bloquear a resposta
    AiConversation.count({ where: { user_id: userId } }).then(async count => {
      if (count > MAX_HISTORY_PAIRS * 2) {
        const excess = await AiConversation.findAll({
          where: { user_id: userId },
          order: [['created_at', 'ASC']],
          limit: count - MAX_HISTORY_PAIRS * 2,
          attributes: ['id'],
        });
        if (excess.length > 0) {
          await AiConversation.destroy({ where: { id: excess.map(r => r.id) } });
        }
      }
    }).catch(() => {});
  },

  async clearHistory(userId) {
    await AiConversation.destroy({ where: { user_id: userId } });
  },

  // Pending confirmations ────────────────────────────────────────────────────

  getPending(userId) {
    const entry = pendingMap.get(userId);
    if (!entry) return null;
    if (Date.now() - entry.createdAt > PENDING_TTL_MS) {
      pendingMap.delete(userId);
      return null;
    }
    return entry;
  },

  setPending(userId, tool, input) {
    pendingMap.set(userId, { tool, input, createdAt: Date.now() });
  },

  clearPending(userId) {
    pendingMap.delete(userId);
  },

  hasPending(userId) {
    return this.getPending(userId) !== null;
  },

  // Audit log ───────────────────────────────────────────────────────────────

  async logAction(userId, toolName, input, result, confirmed = false) {
    try {
      await AiActionsLog.create({
        user_id: userId,
        tool_name: toolName,
        input: input || null,
        result: result || null,
        confirmed,
        executed_at: new Date(),
      });
    } catch (err) {
      console.error('[ConversationStore] logAction error:', err.message);
    }
  },
};

module.exports = ConversationStore;
