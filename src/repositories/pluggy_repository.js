class PluggyRepository {
  constructor() {
    this._apiKey = null;
    this._apiKeyExpiresAt = null;
    this._baseUrl = 'https://api.pluggy.ai';
  }

  async _getApiKey() {
    if (this._apiKey && this._apiKeyExpiresAt > Date.now()) {
      return this._apiKey;
    }
    const res = await fetch(`${this._baseUrl}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: process.env.PLUGGY_CLIENT_ID,
        clientSecret: process.env.PLUGGY_CLIENT_SECRET,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Pluggy auth error: ${JSON.stringify(data)}`);
    this._apiKey = data.apiKey;
    // apiKey válida por 2h; renova 5 min antes
    this._apiKeyExpiresAt = Date.now() + (2 * 60 - 5) * 60 * 1000;
    return this._apiKey;
  }

  async _fetch(path, options = {}) {
    const apiKey = await this._getApiKey();
    const res = await fetch(`${this._baseUrl}${path}`, {
      ...options,
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Pluggy API error ${res.status}: ${JSON.stringify(data)}`);
    return data;
  }

  // Cria token de curta duração para o Connect Widget
  async createConnectToken(webhookUrl = null) {
    const body = {};
    if (webhookUrl) body.webhookUrl = webhookUrl;
    return this._fetch('/connect_token', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Consulta status de uma conexão bancária
  async getItem(itemId) {
    return this._fetch(`/items/${itemId}`);
  }

  // Lista contas de uma conexão
  async getAccounts(itemId) {
    const data = await this._fetch(`/accounts?itemId=${itemId}`);
    return data.results || [];
  }

  // Busca transações paginadas de uma conta
  // from/to: 'YYYY-MM-DD'
  async getTransactions(accountId, from, to) {
    const all = [];
    let page = 1;
    let totalPages = 1;
    do {
      const data = await this._fetch(
        `/transactions?accountId=${accountId}&from=${from}&to=${to}&page=${page}&pageSize=100`
      );
      all.push(...(data.results || []));
      totalPages = data.totalPages || 1;
      page++;
    } while (page <= totalPages);
    return all;
  }

  // Remove uma conexão bancária do Pluggy
  async deleteItem(itemId) {
    return this._fetch(`/items/${itemId}`, { method: 'DELETE' });
  }
}

module.exports = new PluggyRepository();
