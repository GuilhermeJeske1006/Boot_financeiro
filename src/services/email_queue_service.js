const EmailQueueRepository = require('../repositories/email_queue_repository');
const { sendEmail } = require('../utils/email');

class EmailQueueService {
  async enqueue({ to, subject, html }) {
    return EmailQueueRepository.enqueue({ to_email: to, subject, body: html });
  }

  async processPending() {
    const pending = await EmailQueueRepository.findPending(20);

    let sent = 0;
    let errors = 0;

    for (const item of pending) {
      try {
        await sendEmail({ to: item.to_email, subject: item.subject, html: item.body });
        await EmailQueueRepository.markSent(item.id);
        sent++;
      } catch (err) {
        await EmailQueueRepository.markFailed(item.id, err.message);
        errors++;
      }
    }

    return { sent, errors };
  }
}

module.exports = new EmailQueueService();
