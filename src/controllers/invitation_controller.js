const InvitationService = require('../services/invitation_service');

class InvitationController {
  async invite(req, res) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email é obrigatório' });
      await InvitationService.invite(req.params.id, req.userId, email);
      return res.status(201).json({ message: 'Convite enviado com sucesso' });
    } catch (error) {
      console.log(error);
      const status = error.message.includes('permissão') || error.message.includes('Business') ? 403 : 400;
      return res.status(status).json({ error: error.message });
    }
  }

  async listMembers(req, res) {
    try {
      const members = await InvitationService.listMembers(req.params.id, req.userId);
      return res.json(members);
    } catch (error) {
      console.log(error);
      return res.status(400).json({ error: error.message });
    }
  }

  async removeMember(req, res) {
    try {
      await InvitationService.removeMember(req.params.id, req.userId, parseInt(req.params.userId));
      return res.json({ message: 'Membro removido com sucesso' });
    } catch (error) {
      console.log(error);
      const status = error.message.includes('permissão') ? 403 : 400;
      return res.status(status).json({ error: error.message });
    }
  }

  async accept(req, res) {
    try {
      const { token } = req.query;
      if (!token) return res.status(400).json({ error: 'Token é obrigatório' });
      const result = await InvitationService.accept(token, req.userId);
      return res.json({ message: 'Convite aceito com sucesso', company_id: result.company_id });
    } catch (error) {
      console.log(error);
      return res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new InvitationController();
