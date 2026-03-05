const { Goal, GoalContribution } = require('../models');

class GoalRepository {
  async create(data) {
    return Goal.create(data);
  }

  async findAllByUser(userId) {
    return Goal.findAll({
      where: { user_id: userId, status: 'active' },
      include: [{ model: GoalContribution, as: 'contributions', attributes: ['amount'] }],
      order: [['created_at', 'DESC']],
    });
  }

  async findById(id) {
    return Goal.findByPk(id, {
      include: [{ model: GoalContribution, as: 'contributions' }],
    });
  }

  async addContribution(goalId, amount, note, date) {
    const goal = await Goal.findByPk(goalId);
    if (!goal) throw new Error('Meta não encontrada');

    await GoalContribution.create({ goal_id: goalId, amount, note: note || null, date });

    const newAmount = parseFloat(goal.current_amount) + parseFloat(amount);
    const updates = { current_amount: newAmount };
    if (newAmount >= parseFloat(goal.target_amount)) {
      updates.status = 'completed';
    }
    await goal.update(updates);
    return goal.reload({ include: [{ model: GoalContribution, as: 'contributions' }] });
  }

  async cancel(id) {
    const goal = await Goal.findByPk(id);
    if (!goal) throw new Error('Meta não encontrada');
    await goal.update({ status: 'cancelled' });
    return goal;
  }
}

module.exports = new GoalRepository();
