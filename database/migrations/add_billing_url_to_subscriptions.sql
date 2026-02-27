-- ============================================================
-- Migração: Adiciona billing_url e índices na tabela subscriptions
-- Execute este script se o banco já existia antes desta feature
-- ============================================================

-- 1. Adiciona coluna billing_url para reutilização do link MULTIPLE_PAYMENTS
ALTER TABLE subscriptions
    ADD COLUMN billing_url TEXT NULL AFTER external_subscription_id;

-- 2. Índice para findActiveByUserId (consulta mais frequente)
CREATE INDEX idx_subscriptions_user_status
    ON subscriptions (user_id, status);

-- 3. Índice para findExpiringSoon (cron de renovação)
CREATE INDEX idx_subscriptions_renewal
    ON subscriptions (status, payment_provider, expires_at);
