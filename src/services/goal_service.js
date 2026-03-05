const GoalRepository = require('../repositories/goal_repository');

class GoalService {
  async create(userId, name, targetAmount, deadline = null) {
    if (!name || name.trim() === '') throw new Error('Nome da meta é obrigatório');
    const amount = parseFloat(targetAmount);
    if (isNaN(amount) || amount <= 0) throw new Error('Valor alvo deve ser um número positivo');

    return GoalRepository.create({
      user_id: userId,
      name: name.trim(),
      target_amount: amount,
      current_amount: 0,
      deadline: deadline || null,
      status: 'active',
    });
  }

  async listByUser(userId) {
    return GoalRepository.findAllByUser(userId);
  }

  async contribute(goalId, userId, amount, note = null) {
    const goal = await GoalRepository.findById(goalId);
    if (!goal) throw new Error('Meta não encontrada');
    if (goal.user_id !== userId) throw new Error('Sem permissão');
    if (goal.status !== 'active') throw new Error('Esta meta já foi concluída ou cancelada');

    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) throw new Error('Valor deve ser um número positivo');

    const date = new Date().toISOString().split('T')[0];
    return GoalRepository.addContribution(goalId, value, note, date);
  }

  async cancel(goalId, userId) {
    const goal = await GoalRepository.findById(goalId);
    if (!goal) throw new Error('Meta não encontrada');
    if (goal.user_id !== userId) throw new Error('Sem permissão');
    return GoalRepository.cancel(goalId);
  }
}

module.exports = new GoalService();
