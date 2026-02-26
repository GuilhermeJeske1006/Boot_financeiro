const { User, Session, PasswordResetToken, EmailQueue } = require('../models');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const crypto = require('crypto');

class AuthRepository {
  async login(data) {
    if (!data.email || !data.password) {
      throw new Error('Email and password are required');
    }

    const user = await User.findOne({ where: { email: data.email } });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const bcrypt = require('bcrypt');
    const passwordMatch = await bcrypt.compare(data.password, user.password);

    if (!passwordMatch) {
      throw new Error('Invalid email or password');
    }

    const secret = process.env.JWT_SECRET || 'your_jwt_secret';
    const expiresIn = process.env.JWT_EXPIRES || '8h';
    const token = jwt.sign({ user_id: user.id, email: user.email }, secret, { expiresIn });

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 8);

    await Session.create({
      user_id: user.id,
      token,
      expires_at: expiresAt,
    });

    return { token, user: { id: user.id, name: user.name, email: user.email } };
  }

  async logout(token) {
    const session = await Session.findOne({ where: { token } });
    if (!session) {
      throw new Error('Session not found');
    }
    await session.destroy();
    return true;
  }

  async findSessionByToken(token) {
    return Session.findOne({
      where: {
        token,
        expires_at: { [Op.gt]: new Date() },
      },
    });
  }

  async forgotPassword(email) {
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    await PasswordResetToken.update(
      { used: true },
      { where: { user_id: user.id, used: false } }
    );

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await PasswordResetToken.create({
      user_id: user.id,
      token,
      expires_at: expiresAt,
      used: false,
    });

    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Redefinição de Senha</h2>
        <p>Olá ${user.name},</p>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
        <p>Clique no link abaixo para criar uma nova senha:</p>
        <a href="${resetUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">Redefinir Senha</a>
        <p>Ou copie e cole o link no seu navegador:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p>Este link expira em 1 hora.</p>
        <p>Se você não solicitou esta redefinição, ignore este email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">Este é um email automático, não responda.</p>
      </div>
    `;

    await EmailQueue.create({
      to_email: user.email,
      subject: 'Redefinição de Senha',
      body: emailHtml,
      status: 'pending',
      attempts: 0,
    });

    return true;
  }

  async resetPassword(token, newPassword) {
    const resetToken = await PasswordResetToken.findOne({
      where: {
        token,
        used: false,
        expires_at: { [Op.gt]: new Date() },
      },
    });

    if (!resetToken) {
      throw new Error('Token inválido ou expirado');
    }

    const user = await User.findByPk(resetToken.user_id);
    
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    await User.update(
      { password: newPassword },
      { where: { id: user.id } }
    );

    await PasswordResetToken.update(
      { used: true },
      { where: { id: resetToken.id } }
    );

    await Session.destroy({ where: { user_id: user.id } });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Senha Redefinida com Sucesso</h2>
        <p>Olá ${user.name},</p>
        <p>Sua senha foi redefinida com sucesso.</p>
        <p>Se você não realizou esta alteração, entre em contato conosco imediatamente.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">Este é um email automático, não responda.</p>
      </div>
    `;

    await EmailQueue.create({
      to_email: user.email,
      subject: 'Senha Redefinida com Sucesso',
      body: emailHtml,
      status: 'pending',
      attempts: 0,
    });

    return true;
  }
}

module.exports = new AuthRepository();
