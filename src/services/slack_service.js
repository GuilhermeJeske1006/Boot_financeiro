const https = require('https');

class SlackService {
  /**
   * Envia mensagem para um webhook do Slack.
   * @param {string} webhookUrl
   * @param {object} payload
   */
  _send(webhookUrl, payload) {
    if (!webhookUrl) return;

    const body = JSON.stringify(payload);
    const url = new URL(webhookUrl);

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        console.error(`[Slack] Falha ao enviar mensagem. Status: ${res.statusCode}`);
      }
    });

    req.on('error', (err) => {
      console.error('[Slack] Erro na requisição:', err.message);
    });

    req.write(body);
    req.end();
  }

  /**
   * Reporta um erro no canal de erros do Slack.
   * @param {Error|string} error
   * @param {object} context - { route, method, userId, body }
   */
  notifyError(error, context = {}) {
    const webhookUrl = process.env.SLACK_WEBHOOK_ERRORS;
    if (!webhookUrl) return;

    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? (error.stack || '').split('\n').slice(1, 4).join('\n') : '';

    const fields = [
      context.method && context.route
        ? { title: 'Rota', value: `${context.method} ${context.route}`, short: true }
        : null,
      context.userId
        ? { title: 'User ID', value: String(context.userId), short: true }
        : null,
      stack
        ? { title: 'Stack', value: `\`\`\`${stack}\`\`\``, short: false }
        : null,
      context.body && Object.keys(context.body).length > 0
        ? { title: 'Body', value: `\`\`\`${JSON.stringify(context.body, null, 2).slice(0, 300)}\`\`\``, short: false }
        : null,
    ].filter(Boolean);

    const payload = {
      attachments: [
        {
          color: '#e74c3c',
          title: ':rotating_light: Erro na aplicação',
          text: `*${message}*`,
          fields,
          footer: 'Node API',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    this._send(webhookUrl, payload);
  }

  /**
   * Reporta uma nova assinatura no canal de assinaturas do Slack.
   * @param {object} info - { userId, userName, userEmail, planName, billingId }
   */
  notifySubscription(info = {}) {
    const webhookUrl = process.env.SLACK_WEBHOOK_SUBSCRIPTIONS;
    if (!webhookUrl) return;

    const planLabels = { pro: 'Pro :rocket:', business: 'Business :office:' };
    const label = planLabels[info.planName] || info.planName;

    const payload = {
      attachments: [
        {
          color: '#2ecc71',
          title: ':moneybag: Nova Assinatura!',
          fields: [
            { title: 'Usuário', value: info.userName || `ID ${info.userId}`, short: true },
            { title: 'Plano', value: label, short: true },
            info.userEmail
              ? { title: 'E-mail', value: info.userEmail, short: true }
              : null,
            info.billingId
              ? { title: 'Billing ID', value: info.billingId, short: true }
              : null,
          ].filter(Boolean),
          footer: 'Node API',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    this._send(webhookUrl, payload);
  }
}

module.exports = new SlackService();
