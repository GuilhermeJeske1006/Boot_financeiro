const { EmailQueue } = require('../models');
const { Op } = require('sequelize');

class EmailQueueRepository {
  async enqueue({ to_email, subject, body }) {
    return EmailQueue.create({ to_email, subject, body, status: 'pending', attempts: 0 });
  }

  async findPending(limit = 20) {
    return EmailQueue.findAll({
      where: { status: 'pending', attempts: { [Op.lt]: 3 } },
      order: [['created_at', 'ASC']],
      limit,
    });
  }

  async markSent(id) {
    return EmailQueue.update({ status: 'sent' }, { where: { id } });
  }

  async markFailed(id, errorMessage) {
    return EmailQueue.increment('attempts', { where: { id } }).then(() =>
      EmailQueue.update(
        { status: 'failed', error_message: errorMessage },
        { where: { id } }
      )
    );
  }

  async resetFailed(id) {
    return EmailQueue.update({ status: 'pending', error_message: null }, { where: { id } });
  }
}

module.exports = new EmailQueueRepository();
