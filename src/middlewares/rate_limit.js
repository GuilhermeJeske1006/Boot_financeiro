const rateLimit = require('express-rate-limit');

// Limiter para endpoints de autenticação (login, forgot-password, reset-password)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter para criação de conta (evita spam de cadastros)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5,
  message: { error: 'Muitos cadastros realizados. Tente novamente em 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, registerLimiter };
