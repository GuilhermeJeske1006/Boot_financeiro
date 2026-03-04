const PluggyRepository = require('../../repositories/pluggy_repository');
const BankConnectionRepository = require('../../repositories/bank_connection_repository');
const BankSyncService = require('../../services/bank_sync_service');

const MAX_POLL_ATTEMPTS = 5;

function buildConnectUrl(connectToken) {
  const clientId = process.env.PLUGGY_CLIENT_ID;
  return `https://connect.pluggy.ai/connect?clientId=${clientId}&connectToken=${connectToken}`;
}

class OpenBankingMenu {
  async showMain(userId) {
    const connections = await BankConnectionRepository.findByUserId(userId);

    let msg = `🏦 *Open Banking*\n\n`;

    if (connections.length === 0) {
      msg += `_Nenhum banco conectado._\n\n`;
    } else {
      connections.forEach((c) => {
        const statusEmoji =
          c.status === 'connected' ? '✅' : c.status === 'error' ? '❌' : c.status === 'outdated' ? '⚠️' : '⏳';
        const lastSync = c.last_sync_at
          ? new Date(c.last_sync_at).toLocaleDateString('pt-BR')
          : 'nunca';
        msg += `${statusEmoji} *${c.institution_name || 'Banco'}* — _sincronizado: ${lastSync}_\n`;
      });
      msg += `\n`;
    }

    msg += `*1* ➜ Conectar banco 🔗\n`;
    if (connections.length > 0) {
      msg += `*2* ➜ Minhas conexões 📋\n`;
      msg += `*3* ➜ Sincronizar agora 🔄\n`;
      msg += `*4* ➜ Desconectar banco 🔌\n`;
    }
    msg += `*0* ➜ Voltar ao menu 🔙\n\n`;
    msg += `_Digite o número da opção_ ✍️`;

    return { message: msg, connections };
  }

  async handleStep(state, input, userId) {
    if (input === '0') return { done: true, message: '' };

    const { subflow } = state.data || {};

    if (!subflow) {
      return this._handleMainChoice(state, input, userId);
    }

    if (subflow === 'waiting_connect') {
      return this._handleWaitingConnect(state, input, userId);
    }

    if (subflow === 'disconnect') {
      return this._handleDisconnect(state, input, userId);
    }

    return { done: true, message: '❌ Fluxo inválido.' };
  }

  async _handleMainChoice(state, input, userId) {
    const { connections } = state.data;

    if (input === '1') {
      return this._startConnect(state, userId);
    }

    if (input === '2' && connections && connections.length > 0) {
      let msg = `📋 *Minhas Conexões Bancárias*\n\n`;
      connections.forEach((c) => {
        const statusLabel =
          { connected: 'Conectado', pending: 'Pendente', error: 'Erro', outdated: 'Desatualizado' }[c.status] || c.status;
        const lastSync = c.last_sync_at
          ? new Date(c.last_sync_at).toLocaleDateString('pt-BR')
          : 'nunca';
        msg += `🏦 *${c.institution_name || 'Banco'}*\n`;
        msg += `   Status: ${statusLabel}\n`;
        msg += `   Última sinc.: ${lastSync}\n`;
        msg += `   Contas: ${(c.accounts || []).length}\n\n`;
      });
      return { done: true, message: msg };
    }

    if (input === '3' && connections && connections.length > 0) {
      const connectedConns = connections.filter((c) => c.status === 'connected');
      if (connectedConns.length === 0) {
        return { done: true, message: '⚠️ Nenhum banco com status "conectado" para sincronizar.' };
      }
      Promise.all(connectedConns.map((c) => BankSyncService.syncConnection(c.id))).catch(() => {});
      return { done: true, message: `🔄 Sincronização iniciada! As transações serão importadas em breve.` };
    }

    if (input === '4' && connections && connections.length > 0) {
      let msg = `🔌 *Desconectar banco*\n\nEscolha a conexão para remover:\n\n`;
      connections.forEach((c, i) => {
        msg += `  *${i + 1}* ➜ ${c.institution_name || 'Banco'}\n`;
      });
      msg += `\n*0* ➜ Cancelar\n\n_Digite o número_ ✍️`;
      return {
        newState: { ...state, step: state.step + 1, data: { ...state.data, subflow: 'disconnect', connections } },
        message: msg,
      };
    }

    const { message, connections: freshConns } = await this.showMain(userId);
    return {
      newState: { ...state, data: { subflow: null, connections: freshConns } },
      message,
    };
  }

  async _startConnect(state, userId) {
    try {
      const webhookUrl = process.env.APP_BASE_URL
        ? `${process.env.APP_BASE_URL}/api/webhooks/pluggy`
        : null;

      const { accessToken } = await PluggyRepository.createConnectToken(webhookUrl);
      const connectUrl = buildConnectUrl(accessToken);

      const msg = [
        `🔗 *Conectar seu banco*`,
        ``,
        `Abra o link abaixo no seu navegador e siga as instruções para autenticar com seu banco:`,
        ``,
        connectUrl,
        ``,
        `⏳ Após conectar, envie qualquer mensagem aqui e verificaremos a conexão.`,
        ``,
        `*0* ➜ Cancelar`,
      ].join('\n');

      return {
        newState: {
          ...state,
          step: state.step + 1,
          data: {
            ...state.data,
            subflow: 'waiting_connect',
            pollAttempts: 0,
          },
        },
        message: msg,
      };
    } catch (err) {
      console.error('[OpenBanking] Erro ao criar connect token:', err.message);
      return {
        newState: state,
        message: '❌ Não foi possível gerar o link de conexão. Tente novamente em instantes.',
      };
    }
  }

  async _handleWaitingConnect(state, input, userId) {
    if (input === '0') {
      return { done: true, message: '❌ Conexão cancelada.' };
    }

    const { pollAttempts } = state.data;

    if (pollAttempts >= MAX_POLL_ATTEMPTS) {
      return {
        done: true,
        message: [
          `⏰ *Tempo de espera esgotado.*`,
          ``,
          `A conexão não foi confirmada ainda. Se você concluiu a autenticação no banco, aguarde alguns minutos e use a opção *3 - Sincronizar agora* no menu Open Banking.`,
        ].join('\n'),
      };
    }

    const connections = await BankConnectionRepository.findByUserId(userId);
    const newConn = connections.find((c) => c.status === 'connected');

    if (newConn) {
      return {
        done: true,
        message: [
          `✅ *Banco conectado com sucesso!*`,
          ``,
          `🏦 ${newConn.institution_name || 'Banco'} conectado.`,
          ``,
          `As transações dos últimos 90 dias serão importadas automaticamente em breve.`,
          ``,
          `Use a opção *11* no menu para gerenciar suas conexões bancárias.`,
        ].join('\n'),
      };
    }

    return {
      newState: {
        ...state,
        data: { ...state.data, pollAttempts: pollAttempts + 1 },
      },
      message: [
        `⏳ *Aguardando confirmação do banco...*`,
        ``,
        `Se você já autenticou no link, aguarde alguns segundos e envie qualquer mensagem novamente.`,
        `Tentativa ${pollAttempts + 1}/${MAX_POLL_ATTEMPTS}.`,
        ``,
        `*0* ➜ Cancelar`,
      ].join('\n'),
    };
  }

  async _handleDisconnect(state, input, userId) {
    if (input === '0') return { done: true, message: '❌ Operação cancelada.' };

    const { connections } = state.data;

    if (!state.data.awaitingConfirm) {
      const index = parseInt(input) - 1;
      if (isNaN(index) || index < 0 || index >= connections.length) {
        return {
          newState: state,
          message: `⚠️ Opção inválida. Digite de 1 a ${connections.length} ou *0* para cancelar.`,
        };
      }
      const selected = connections[index];
      return {
        newState: {
          ...state,
          data: { ...state.data, awaitingConfirm: true, selectedConn: selected },
        },
        message: [
          `⚠️ *Confirmar desconexão?*`,
          ``,
          `🏦 *${selected.institution_name || 'Banco'}*`,
          `As transações já importadas *não* serão excluídas.`,
          ``,
          `*S* ➜ Confirmar | *N* ➜ Cancelar`,
        ].join('\n'),
      };
    }

    if (input.toUpperCase() === 'S') {
      const { selectedConn } = state.data;
      try {
        await PluggyRepository.deleteItem(selectedConn.pluggy_item_id).catch(() => {});
        await BankConnectionRepository.delete(selectedConn.id);
        return { done: true, message: `✅ Banco *${selectedConn.institution_name || 'Banco'}* desconectado com sucesso.` };
      } catch (err) {
        return { done: true, message: `❌ Erro ao desconectar: ${err.message}` };
      }
    }

    return { done: true, message: '❌ Operação cancelada.' };
  }
}

module.exports = new OpenBankingMenu();
