const crypto = require('crypto');
const UserCompanyMemberRepository = require('../repositories/user_company_member_repository');
const EmailQueueRepository = require('../repositories/email_queue_repository');
const CompanyRepository = require('../repositories/company_repository');
const UserRepository = require('../repositories/user_respository');
const SubscriptionService = require('./subscription_service');

class InvitationService {
  async invite(companyId, ownerUserId, invitedEmail) {
    const company = await CompanyRepository.findById(companyId);
    if (!company) throw new Error('Empresa não encontrada');
    if (company.user_id !== ownerUserId) throw new Error('Sem permissão para convidar membros');

    const hasMultiUser = await SubscriptionService.hasFeature(ownerUserId, 'multi_user');
    if (!hasMultiUser) throw new Error('Funcionalidade exclusiva do plano Business');

    const existing = await UserCompanyMemberRepository.findByCompanyAndEmail(companyId, invitedEmail);
    if (existing) throw new Error('Este email já foi convidado para esta empresa');

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    const member = await UserCompanyMemberRepository.create({
      company_id: companyId,
      invited_email: invitedEmail,
      invitation_token: token,
      expires_at: expiresAt,
      status: 'invited',
    });

    const acceptUrl = `${process.env.APP_URL || 'http://localhost:3000'}/api/invitations/accept?token=${token}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Convite para ${company.name}</h2>
        <p>Você foi convidado para fazer parte da empresa <strong>${company.name}</strong> no Bot Financeiro.</p>
        <p>Clique no botão abaixo para aceitar o convite (válido por 48 horas):</p>
        <a href="${acceptUrl}" style="display:inline-block;background:#007bff;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;margin:16px 0;">Aceitar Convite</a>
        <p style="color:#999;font-size:12px;">Se não reconhece este convite, ignore este email.</p>
      </div>
    `;

    await EmailQueueRepository.enqueue({
      to_email: invitedEmail,
      subject: `Convite para ${company.name}`,
      body: html,
    });

    return member;
  }

  async accept(token, acceptingUserId) {
    const member = await UserCompanyMemberRepository.findByToken(token);
    if (!member) throw new Error('Token inválido ou expirado');

    const user = await UserRepository.findById(acceptingUserId);
    if (!user) throw new Error('Usuário não encontrado');

    if (user.email.toLowerCase() !== member.invited_email.toLowerCase()) {
      throw new Error('Este convite foi enviado para outro email');
    }

    const alreadyMember = await UserCompanyMemberRepository.findByCompanyAndUser(
      member.company_id,
      acceptingUserId
    );
    if (alreadyMember) throw new Error('Você já é membro desta empresa');

    await UserCompanyMemberRepository.activate(member.id, acceptingUserId);
    return { company_id: member.company_id };
  }

  async listMembers(companyId, ownerUserId) {
    const company = await CompanyRepository.findById(companyId);
    if (!company) throw new Error('Empresa não encontrada');
    if (company.user_id !== ownerUserId) throw new Error('Sem permissão');

    const members = await UserCompanyMemberRepository.findByCompany(companyId);
    return members;
  }

  async removeMember(companyId, ownerUserId, targetUserId) {
    const company = await CompanyRepository.findById(companyId);
    if (!company) throw new Error('Empresa não encontrada');
    if (company.user_id !== ownerUserId) throw new Error('Sem permissão para remover membros');
    if (company.user_id === targetUserId) throw new Error('Não é possível remover o proprietário da empresa');

    const deleted = await UserCompanyMemberRepository.delete(companyId, targetUserId);
    if (!deleted) throw new Error('Membro não encontrado');
    return true;
  }
}

module.exports = new InvitationService();
