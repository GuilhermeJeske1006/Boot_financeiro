const SlackService = require('../services/slack_service');

/**
 * Middleware global de tratamento de erros.
 * Deve ser registrado APÓS todas as rotas no app.js.
 */
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;

  // Só notifica o Slack para erros 5xx (erros do servidor)
  if (status >= 500) {
    SlackService.notifyError(err, {
      method: req.method,
      route: req.originalUrl,
      userId: req.userId || null,
      body: req.body,
    });
  }

  const message = status < 500 ? err.message : 'Erro interno do servidor';
  return res.status(status).json({ error: message });
}

module.exports = errorHandler;
