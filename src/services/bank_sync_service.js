const PluggyRepository = require('../repositories/pluggy_repository');
const BankConnectionRepository = require('../repositories/bank_connection_repository');
const CategoryRepository = require('../repositories/category_repository');
const { Transaction } = require('../models');

// Mapeamento estático de keywords → nome de categoria padrão
const CATEGORY_KEYWORD_MAP = [
  { keywords: ['supermercado', 'mercado', 'atacadão', 'carrefour', 'extra', 'walmart', 'hortifruti', 'atacado'], category: 'Alimentação' },
  { keywords: ['restaurante', 'lanchonete', 'ifood', 'rappi', 'uber eats', 'delivery', 'pizza', 'hamburger', 'sushi'], category: 'Alimentação' },
  { keywords: ['combustivel', 'combustível', 'gasolina', 'posto', 'shell', 'petrobras', 'ipiranga', 'br distribuidora'], category: 'Transporte' },
  { keywords: ['uber', '99pop', 'cabify', 'taxi', 'onibus', 'ônibus', 'metro', 'metrô', 'passagem', 'transporte'], category: 'Transporte' },
  { keywords: ['farmacia', 'farmácia', 'drogaria', 'ultrafarma', 'droga raia', 'pacheco', 'drogasil'], category: 'Saúde' },
  { keywords: ['hospital', 'clinica', 'clínica', 'medico', 'médico', 'dentista', 'plano de saude', 'unimed', 'amil', 'bradesco saude'], category: 'Saúde' },
  { keywords: ['academia', 'smart fit', 'bluefit', 'crossfit', 'bodytech'], category: 'Saúde' },
  { keywords: ['energia', 'agua', 'água', 'gas', 'gás', 'luz', 'enel', 'copel', 'cemig', 'sabesp', 'comgas'], category: 'Moradia' },
  { keywords: ['aluguel', 'condominio', 'condomínio', 'iptu', 'financiamento imovel', 'prestacao imovel'], category: 'Moradia' },
  { keywords: ['netflix', 'spotify', 'amazon prime', 'disney', 'hbo', 'globoplay', 'apple tv', 'paramount'], category: 'Lazer' },
  { keywords: ['escola', 'faculdade', 'universidade', 'curso', 'mensalidade escolar', 'colegio'], category: 'Educação' },
  { keywords: ['salario', 'salário', 'pagamento folha', 'remuneracao', 'remuneração', 'vencimento'], category: 'Salário' },
  { keywords: ['investimento', 'renda fixa', 'tesouro direto', 'cdb', 'poupanca', 'poupança', 'lci', 'lca'], category: 'Investimentos' },
];

class BankSyncService {
  // Sincroniza uma única conexão bancária
  async syncConnection(connectionId) {
    const conn = await BankConnectionRepository.findById(connectionId);
    if (!conn) throw new Error('Conexão não encontrada');

    const to = new Date().toISOString().split('T')[0];
    const fromDate = conn.last_sync_at
      ? new Date(conn.last_sync_at)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const from = fromDate.toISOString().split('T')[0];

    let totalImported = 0;
    let totalSkipped = 0;

    try {
      const pluggyAccounts = await PluggyRepository.getAccounts(conn.pluggy_item_id);
      await BankConnectionRepository.upsertAccounts(conn.id, conn.user_id, pluggyAccounts);

      const userCategories = await CategoryRepository.findAll(conn.user_id);

      for (const account of pluggyAccounts) {
        const pluggyTxs = await PluggyRepository.getTransactions(account.id, from, to);
        const { imported, skipped } = await this._importTransactions(pluggyTxs, conn.user_id, userCategories);
        totalImported += imported;
        totalSkipped += skipped;
      }

      await BankConnectionRepository.updateLastSync(conn.id);
      await BankConnectionRepository.updateStatus(conn.id, 'connected');
    } catch (err) {
      console.error(`[BankSync] Erro ao sincronizar conexão ${connectionId}:`, err.message);
      await BankConnectionRepository.updateStatus(conn.id, 'error');
      throw err;
    }

    return { imported: totalImported, skipped: totalSkipped };
  }

  // Sincroniza todas as conexões ativas (usado pelo cron)
  async syncAll() {
    const connections = await BankConnectionRepository.findAllConnected();
    const results = { total: connections.length, imported: 0, errors: 0 };
    for (const conn of connections) {
      try {
        const { imported } = await this.syncConnection(conn.id);
        results.imported += imported;
      } catch (_) {
        results.errors++;
      }
    }
    return results;
  }

  async _importTransactions(pluggyTxs, userId, userCategories) {
    let imported = 0;
    let skipped = 0;

    for (const tx of pluggyTxs) {
      try {
        const exists = await Transaction.findOne({ where: { external_id: tx.id } });
        if (exists) {
          skipped++;
          continue;
        }

        const type = tx.type === 'CREDIT' ? 'income' : 'expense';
        const categoryId = await this._resolveCategory(tx, type, userCategories);

        if (!categoryId) {
          console.warn(`[BankSync] Sem categoria para userId=${userId}, tx=${tx.id}`);
          skipped++;
          continue;
        }

        const date = tx.date ? tx.date.split('T')[0] : new Date().toISOString().split('T')[0];

        await Transaction.create({
          type,
          amount: Math.abs(tx.amount),
          description: tx.description || tx.descriptionRaw || null,
          category_id: categoryId,
          user_id: userId,
          company_id: null,
          date,
          source: 'open_banking',
          external_id: tx.id,
        });

        imported++;
      } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
          skipped++;
        } else {
          console.error(`[BankSync] Erro ao importar tx ${tx.id}:`, err.message);
          skipped++;
        }
      }
    }

    return { imported, skipped };
  }

  async _resolveCategory(tx, type, userCategories) {
    const needle = [
      tx.category || '',
      tx.description || '',
      tx.descriptionRaw || '',
    ].join(' ').toLowerCase();

    // 1. Pluggy category name vs. user category name
    if (tx.category) {
      const pluggyCategory = tx.category.toLowerCase();
      const match = userCategories.find(
        (c) => c.name.toLowerCase() === pluggyCategory && (c.type === type || c.type === 'both')
      );
      if (match) return match.id;
    }

    // 2. Keyword matching estático
    for (const entry of CATEGORY_KEYWORD_MAP) {
      const hit = entry.keywords.some((kw) => needle.includes(kw));
      if (hit) {
        const match = userCategories.find(
          (c) => c.name === entry.category && (c.type === type || c.type === 'both')
        );
        if (match) return match.id;
      }
    }

    // 3. Fallback para "Outros"
    const outros = userCategories.find(
      (c) => c.name === 'Outros' && (c.type === type || c.type === 'both')
    );
    if (outros) return outros.id;

    // 4. Fallback absoluto: primeira categoria do tipo correto
    const fallback = userCategories.find((c) => c.type === type || c.type === 'both');
    return fallback ? fallback.id : null;
  }
}

module.exports = new BankSyncService();
