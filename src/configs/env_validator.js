const REQUIRED_ENV_VARS = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASS',
  'JWT_SECRET',
];

function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(
      `[FATAL] Variáveis de ambiente obrigatórias não configuradas: ${missing.join(', ')}\n` +
      'Verifique o arquivo .env e configure todas as variáveis necessárias.'
    );
    process.exit(1);
  }
}

module.exports = validateEnv;
