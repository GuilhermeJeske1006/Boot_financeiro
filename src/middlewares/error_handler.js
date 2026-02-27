const SlackService = require('../services/slack_service');

const SEQUELIZE_ERROR_NAMES = new Set([
  'SequelizeDatabaseError',
  'SequelizeConnectionError',
  'SequelizeConnectionRefusedError',
  'SequelizeConnectionTimedOutError',
  'SequelizeHostNotFoundError',
  'SequelizeAccessDeniedError',
  'SequelizeUniqueConstraintError',
  'SequelizeForeignKeyConstraintError',
  'SequelizeTimeoutError',
]);

/**
 * Middleware global de tratamento de erros.
 * Deve ser registrado APÓS todas as rotas no app.js.
 */
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const isDbError = SEQUELIZE_ERROR_NAMES.has(err.name);

  // Notifica erros 5xx e qualquer erro de banco de dados
  if (status >= 500 || isDbError) {
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
