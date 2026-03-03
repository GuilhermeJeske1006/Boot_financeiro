// Rate limiter por telefone — janela deslizante em memória
// MAX_MESSAGES mensagens dentro de WINDOW_MS → bloqueia por COOLDOWN_MS

const MAX_MESSAGES = 5;
const WINDOW_MS = 10_000;   // 10 segundos
const COOLDOWN_MS = 30_000; // 30 segundos de silêncio após bloqueio

// phone -> { timestamps: number[], blockedUntil: number | null, warned: boolean }
const state = new Map();

function _get(phone) {
  if (!state.has(phone)) {
    state.set(phone, { timestamps: [], blockedUntil: null, warned: false });
  }
  return state.get(phone);
}

/**
 * Registra uma mensagem e verifica se é spam.
 * @returns {{ blocked: boolean, shouldWarn: boolean }}
 *   blocked     — true = ignorar a mensagem
 *   shouldWarn  — true = enviar aviso ao usuário (apenas na primeira vez)
 */
function check(phone) {
  const entry = _get(phone);
  const now = Date.now();

  // Ainda em cooldown?
  if (entry.blockedUntil && now < entry.blockedUntil) {
    return { blocked: true, shouldWarn: false };
  }

  // Limpa cooldown expirado
  if (entry.blockedUntil && now >= entry.blockedUntil) {
    entry.blockedUntil = null;
    entry.warned = false;
    entry.timestamps = [];
  }

  // Remove timestamps fora da janela
  entry.timestamps = entry.timestamps.filter(t => now - t < WINDOW_MS);
  entry.timestamps.push(now);

  if (entry.timestamps.length > MAX_MESSAGES) {
    entry.blockedUntil = now + COOLDOWN_MS;
    entry.timestamps = [];
    const shouldWarn = !entry.warned;
    entry.warned = true;
    return { blocked: true, shouldWarn };
  }

  return { blocked: false, shouldWarn: false };
}

module.exports = { check };
