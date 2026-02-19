class MainMenu {
  show() {
    return (
      `💰 *Bot Financeiro* 💰\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `Escolha uma opção:\n\n` +
      `1️⃣ ➜ Registrar Entrada 📈\n` +
      `2️⃣ ➜ Registrar Saída 📉\n` +
      `3️⃣ ➜ Ver Saldo do Mês 💵\n` +
      `4️⃣ ➜ Ver Relatório Mensal 📊\n` +
      `5️⃣ ➜ Gerenciar Categorias 🏷️\n\n` +
      `_Digite o número da opção desejada_ ✍️`
    );
  }
}

module.exports = new MainMenu();
