-- ============================================================
-- Migração: Adiciona tabelas plans e subscriptions
-- Execute este script se o banco já existia antes desta feature
-- ============================================================

-- 1. plans
CREATE TABLE IF NOT EXISTS plans (
    id                          INT            NOT NULL AUTO_INCREMENT,
    name                        ENUM('free', 'pro', 'business') NOT NULL,
    display_name                VARCHAR(255)   NOT NULL,
    price_brl                   DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    max_transactions_per_month  INT            NOT NULL DEFAULT 50   COMMENT '-1 = ilimitado',
    max_companies               INT            NOT NULL DEFAULT 1    COMMENT '-1 = ilimitado',
    whatsapp_reports            TINYINT(1)     NOT NULL DEFAULT 0,
    pdf_export                  TINYINT(1)     NOT NULL DEFAULT 0,
    multi_user                  TINYINT(1)     NOT NULL DEFAULT 0,
    is_active                   TINYINT(1)     NOT NULL DEFAULT 1,
    created_at                  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE (name)
);

-- 2. subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id                       INT          NOT NULL AUTO_INCREMENT,
    user_id                  INT          NOT NULL,
    plan_id                  INT          NOT NULL,
    status                   ENUM('active', 'cancelled', 'expired', 'trial') NOT NULL DEFAULT 'active',
    starts_at                DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at               DATETIME     NULL      COMMENT 'NULL = sem expiração (plano free)',
    payment_provider         ENUM('manual', 'stripe', 'abacatepay') NOT NULL DEFAULT 'manual',
    external_subscription_id VARCHAR(255) NULL,
    billing_url              TEXT         NULL      COMMENT 'URL do billing MULTIPLE_PAYMENTS para renovação',
    created_at               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES plans (id),
    INDEX idx_subscriptions_user_status (user_id, status),
    INDEX idx_subscriptions_renewal     (status, payment_provider, expires_at)
);

-- 3. Seed dos planos padrão
INSERT INTO plans (name, display_name, price_brl, max_transactions_per_month, max_companies, whatsapp_reports, pdf_export, multi_user)
VALUES
    ('free',     'Grátis',    0.00, 50, 1, 0, 0, 0),
    ('pro',      'Pro',      29.90, -1, 5, 1, 1, 0),
    ('business', 'Business', 79.90, -1,-1, 1, 1, 1)
ON DUPLICATE KEY UPDATE
    display_name = VALUES(display_name),
    price_brl    = VALUES(price_brl);

-- 4. Atribui plano free a todos os usuários que ainda não têm assinatura
INSERT INTO subscriptions (user_id, plan_id, status, starts_at, expires_at, payment_provider)
SELECT
    u.id,
    (SELECT id FROM plans WHERE name = 'free'),
    'active',
    NOW(),
    NULL,
    'manual'
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM subscriptions s WHERE s.user_id = u.id
);
