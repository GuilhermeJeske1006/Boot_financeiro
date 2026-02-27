-- ============================================================
-- Criação das tabelas
-- Ordem respeita dependências de foreign keys
-- ============================================================

-- 1. users
CREATE TABLE IF NOT EXISTS users (
    id            INT          NOT NULL AUTO_INCREMENT,
    name          VARCHAR(255) NOT NULL,
    phone         VARCHAR(255) NULL,
    email         VARCHAR(255) NULL,
    password      VARCHAR(255) NULL,
    user_type     ENUM('PF', 'PJ') NOT NULL DEFAULT 'PF',
    remember_token VARCHAR(255) NULL,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT users_phone_unique UNIQUE (phone),
    CONSTRAINT users_email_unique UNIQUE (email)
);

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
);

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
);

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
);

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
);

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
);

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
);

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
    is_active                   TINYINT(1)     NOT NULL DEFAULT 1,
    created_at                  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE (name)
);

-- 9. subscriptions (depende de users e plans)
CREATE TABLE IF NOT EXISTS subscriptions (
    id                      INT          NOT NULL AUTO_INCREMENT,
    user_id                 INT          NOT NULL,
    plan_id                 INT          NOT NULL,
    status                  ENUM('active', 'cancelled', 'expired', 'trial') NOT NULL DEFAULT 'active',
    starts_at               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at              DATETIME     NULL      COMMENT 'NULL = sem expiração (plano free)',
    payment_provider        ENUM('manual', 'stripe', 'abacatepay') NOT NULL DEFAULT 'manual',
    external_subscription_id VARCHAR(255) NULL,
    billing_url             TEXT         NULL      COMMENT 'URL do billing MULTIPLE_PAYMENTS para renovação',
    created_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES plans (id),
    INDEX idx_subscriptions_user_status (user_id, status),
    INDEX idx_subscriptions_renewal     (status, payment_provider, expires_at)
);

-- ============================================================
-- Seed: planos padrão
-- ============================================================
INSERT INTO plans (name, display_name, price_brl, max_transactions_per_month, max_companies, whatsapp_reports, pdf_export, multi_user)
VALUES
    ('free',     'Grátis',   0.00,  50, 1, 0, 0, 0),
    ('pro',      'Pro',     29.90,  -1, 5, 1, 1, 0),
    ('business', 'Business',79.90,  -1,-1, 1, 1, 1)
ON DUPLICATE KEY UPDATE
    display_name = VALUES(display_name),
    price_brl    = VALUES(price_brl);
