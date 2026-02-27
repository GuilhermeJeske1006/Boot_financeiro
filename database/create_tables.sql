-- ============================================================
-- Schema completo + migrations consolidadas
-- Ordem respeita dependências de foreign keys
-- Seguro para rodar em banco novo OU já existente
-- ============================================================

-- 1. users
CREATE TABLE IF NOT EXISTS users (
    id             INT          NOT NULL AUTO_INCREMENT,
    name           VARCHAR(255) NOT NULL,
    phone          VARCHAR(255) NULL,
    email          VARCHAR(255) NULL,
    password       VARCHAR(255) NULL,
    user_type      ENUM('PF', 'PJ') NOT NULL DEFAULT 'PF',
    tax_id         VARCHAR(18)  NULL     COMMENT 'CPF (11 dígitos) ou CNPJ (14 dígitos)',
    remember_token VARCHAR(255) NULL,
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT users_phone_unique UNIQUE (phone),
    CONSTRAINT users_email_unique UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. companies (depende de users)
CREATE TABLE IF NOT EXISTS companies (
    id         INT          NOT NULL AUTO_INCREMENT,
    name       VARCHAR(255) NOT NULL,
    cnpj       VARCHAR(18)  NULL,
    email      VARCHAR(255) NULL,
    phone      VARCHAR(255) NULL,
    address    TEXT         NULL,
    user_id    INT          NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE (cnpj),
    CONSTRAINT fk_companies_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. categories (depende de users)
CREATE TABLE IF NOT EXISTS categories (
    id         INT          NOT NULL AUTO_INCREMENT,
    name       VARCHAR(255) NOT NULL,
    type       ENUM('income', 'expense', 'both') NOT NULL,
    is_default TINYINT(1)   NOT NULL DEFAULT 0,
    is_company TINYINT(1)   NOT NULL DEFAULT 0,
    user_id    INT          NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_categories_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. transactions (depende de categories, users e companies)
CREATE TABLE IF NOT EXISTS transactions (
    id          INT              NOT NULL AUTO_INCREMENT,
    type        ENUM('income', 'expense') NOT NULL,
    amount      DECIMAL(10, 2)   NOT NULL,
    description VARCHAR(255)     NULL,
    category_id INT              NOT NULL,
    user_id     INT              NULL,
    company_id  INT              NULL,
    date        DATE             NOT NULL DEFAULT (CURRENT_DATE),
    created_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_transactions_category FOREIGN KEY (category_id) REFERENCES categories (id),
    CONSTRAINT fk_transactions_user     FOREIGN KEY (user_id)     REFERENCES users (id),
    CONSTRAINT fk_transactions_company  FOREIGN KEY (company_id)  REFERENCES companies (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. sessions (depende de users)
CREATE TABLE IF NOT EXISTS sessions (
    id         INT          NOT NULL AUTO_INCREMENT,
    user_id    INT          NOT NULL,
    token      VARCHAR(512) NOT NULL,
    expires_at DATETIME     NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE (token),
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. password_reset_tokens (depende de users)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id         INT          NOT NULL AUTO_INCREMENT,
    user_id    INT          NOT NULL,
    token      VARCHAR(255) NOT NULL,
    expires_at DATETIME     NOT NULL,
    used       TINYINT(1)   NOT NULL DEFAULT 0,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE (token),
    CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. email_queue (sem dependências)
CREATE TABLE IF NOT EXISTS email_queue (
    id            INT          NOT NULL AUTO_INCREMENT,
    to_email      VARCHAR(255) NOT NULL,
    subject       VARCHAR(255) NOT NULL,
    body          TEXT         NOT NULL,
    status        ENUM('pending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
    attempts      TINYINT      NOT NULL DEFAULT 0,
    error_message TEXT         NULL,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. plans (sem dependências)
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
    recurring_transactions      TINYINT(1)     NOT NULL DEFAULT 0,
    is_active                   TINYINT(1)     NOT NULL DEFAULT 1,
    created_at                  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. subscriptions (depende de users e plans)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. recurring_transactions (depende de users, companies e categories)
CREATE TABLE IF NOT EXISTS recurring_transactions (
    id          INT              NOT NULL AUTO_INCREMENT,
    type        ENUM('income', 'expense') NOT NULL,
    amount      DECIMAL(10, 2)   NOT NULL,
    description VARCHAR(255)     NULL,
    category_id INT              NOT NULL,
    user_id     INT              NULL,
    company_id  INT              NULL,
    frequency   ENUM('daily', 'weekly', 'monthly', 'yearly') NOT NULL,
    next_date   DATE             NOT NULL                     COMMENT 'Data da próxima geração automática',
    is_active   TINYINT(1)       NOT NULL DEFAULT 1,
    created_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_recurring_category FOREIGN KEY (category_id) REFERENCES categories (id),
    CONSTRAINT fk_recurring_user     FOREIGN KEY (user_id)     REFERENCES users (id),
    CONSTRAINT fk_recurring_company  FOREIGN KEY (company_id)  REFERENCES companies (id),
    INDEX idx_recurring_due (is_active, next_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Seed: planos padrão
-- ============================================================
INSERT INTO plans (name, display_name, price_brl, max_transactions_per_month, max_companies, whatsapp_reports, pdf_export, multi_user, recurring_transactions)
VALUES
    ('free',     'Grátis',   0.00,  50, 1, 0, 0, 0, 0),
    ('pro',      'Pro',     29.90,  -1, 5, 1, 1, 0, 1),
    ('business', 'Business',79.90,  -1,-1, 1, 1, 1, 1)
ON DUPLICATE KEY UPDATE
    display_name           = VALUES(display_name),
    price_brl              = VALUES(price_brl),
    whatsapp_reports       = VALUES(whatsapp_reports),
    pdf_export             = VALUES(pdf_export),
    multi_user             = VALUES(multi_user),
    recurring_transactions = VALUES(recurring_transactions);

-- Atribui plano free a todos os usuários que ainda não têm assinatura
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

-- ============================================================
-- Migrations para bancos já existentes
-- Compatível com MySQL 5.7+ (usa INFORMATION_SCHEMA em vez de IF NOT EXISTS)
-- ============================================================

DELIMITER $$

-- Procedure auxiliar: adiciona coluna apenas se ela ainda não existir
DROP PROCEDURE IF EXISTS _safe_add_column$$
CREATE PROCEDURE _safe_add_column(
    IN p_table  VARCHAR(64),
    IN p_col    VARCHAR(64),
    IN p_def    TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE  TABLE_SCHEMA = DATABASE()
          AND  TABLE_NAME   = p_table
          AND  COLUMN_NAME  = p_col
    ) THEN
        SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_col, '` ', p_def);
        PREPARE s FROM @ddl;
        EXECUTE s;
        DEALLOCATE PREPARE s;
    END IF;
END$$

-- Procedure auxiliar: cria índice apenas se ele ainda não existir
DROP PROCEDURE IF EXISTS _safe_add_index$$
CREATE PROCEDURE _safe_add_index(
    IN p_table VARCHAR(64),
    IN p_idx   VARCHAR(64),
    IN p_cols  TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
        WHERE  TABLE_SCHEMA = DATABASE()
          AND  TABLE_NAME   = p_table
          AND  INDEX_NAME   = p_idx
    ) THEN
        SET @ddl = CONCAT('CREATE INDEX `', p_idx, '` ON `', p_table, '` (', p_cols, ')');
        PREPARE s FROM @ddl;
        EXECUTE s;
        DEALLOCATE PREPARE s;
    END IF;
END$$

DELIMITER ;

-- [001] tax_id em users
CALL _safe_add_column('users', 'tax_id',
    "VARCHAR(18) NULL COMMENT 'CPF (11 dígitos) ou CNPJ (14 dígitos)' AFTER user_type");

-- [002] billing_url em subscriptions
CALL _safe_add_column('subscriptions', 'billing_url',
    "TEXT NULL COMMENT 'URL do billing MULTIPLE_PAYMENTS para renovação' AFTER external_subscription_id");

-- [002] Índices em subscriptions
CALL _safe_add_index('subscriptions', 'idx_subscriptions_user_status', 'user_id, status');
CALL _safe_add_index('subscriptions', 'idx_subscriptions_renewal',     'status, payment_provider, expires_at');

-- [003] recurring_transactions em plans
CALL _safe_add_column('plans', 'recurring_transactions',
    "TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Feature: transações recorrentes (Pro/Business)'");

-- [003] Garante que os valores estejam corretos nos planos existentes
UPDATE plans SET recurring_transactions = 0 WHERE name = 'free';
UPDATE plans SET recurring_transactions = 1 WHERE name IN ('pro', 'business');

-- Limpeza das procedures auxiliares
DROP PROCEDURE IF EXISTS _safe_add_column;
DROP PROCEDURE IF EXISTS _safe_add_index;
