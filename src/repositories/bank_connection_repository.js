const { BankConnection, BankAccount } = require('../models');

class BankConnectionRepository {
  async create({ user_id, pluggy_item_id, institution_name, institution_id }) {
    return BankConnection.create({
      user_id,
      pluggy_item_id,
      institution_name: institution_name || null,
      institution_id: institution_id || null,
      status: 'pending',
    });
  }

  async findById(id) {
    return BankConnection.findByPk(id, {
      include: [{ model: BankAccount, as: 'accounts' }],
    });
  }

  async findByPluggyItemId(pluggyItemId) {
    return BankConnection.findOne({ where: { pluggy_item_id: pluggyItemId } });
  }

  async findByUserId(userId) {
    return BankConnection.findAll({
      where: { user_id: userId },
      include: [{ model: BankAccount, as: 'accounts' }],
      order: [['created_at', 'DESC']],
    });
  }

  async findAllConnected() {
    return BankConnection.findAll({
      where: { status: 'connected' },
      include: [{ model: BankAccount, as: 'accounts' }],
    });
  }

  async updateStatus(id, status) {
    return BankConnection.update({ status, updated_at: new Date() }, { where: { id } });
  }

  async updateLastSync(id) {
    return BankConnection.update(
      { last_sync_at: new Date(), updated_at: new Date() },
      { where: { id } }
    );
  }

  async delete(id) {
    const conn = await BankConnection.findByPk(id);
    if (!conn) throw new Error('Conexão bancária não encontrada');
    await conn.destroy();
    return true;
  }

  async upsertAccounts(bankConnectionId, userId, pluggyAccounts) {
    const results = [];
    for (const acc of pluggyAccounts) {
      const [record] = await BankAccount.upsert({
        bank_connection_id: bankConnectionId,
        user_id: userId,
        pluggy_account_id: acc.id,
        name: acc.name || null,
        type: acc.subtype || acc.type || null,
        balance: acc.balance != null ? acc.balance : null,
        currency_code: acc.currencyCode || 'BRL',
        updated_at: new Date(),
      });
      results.push(record);
    }
    return results;
  }
}

module.exports = new BankConnectionRepository();
