const AgentOrchestrator = require('../whatsapp/ai/agent_orchestrator');

class AiController {
  async chat(req, res) {
    try {
      const { message } = req.body;
      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ error: 'Mensagem é obrigatória' });
      }

      const result = await AgentOrchestrator.process(req.userId, message.trim());

      if (result && typeof result === 'object' && result.__media) {
        return res.json({ reply: result.text, media: result.__media });
      }

      return res.json({ reply: result });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  async clearHistory(req, res) {
    try {
      await AgentOrchestrator.clearHistory(req.userId);
      return res.json({ message: 'Histórico limpo' });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new AiController();
