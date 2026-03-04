-- ============================================================
-- Schema PostgreSQL + migrations consolidadas
-- Ordem respeita dependências de foreign keys
-- Seguro para rodar em banco novo OU já existente
-- ============================================================

-- ─── Tipos ENUM ──────────────────────────────────────────────────────────────

DO $$ BEGIN CREATE TYPE user_type_enum           AS ENUM ('PF', 'PJ');                              EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE transaction_type_enum    AS ENUM ('income', 'expense');                     EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE category_type_enum       AS ENUM ('income', 'expense', 'both');             EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE email_status_enum        AS ENUM ('pending', 'sent', 'failed');             EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE plan_name_enum           AS ENUM ('free', 'pro', 'business');               EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE subscription_status_enum AS ENUM ('active', 'cancelled', 'expired', 'trial'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_provider_enum    AS ENUM ('manual', 'stripe', 'abacatepay');        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE frequency_enum           AS ENUM ('daily', 'weekly', 'monthly', 'yearly');  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Tabelas ─────────────────────────────────────────────────────────────────

-- 1. users
CREATE TABLE IF NOT EXISTS users (
    id             SERIAL           NOT NULL,
    name           VARCHAR(255)     NOT NULL,
    phone          VARCHAR(255)     NULL,
    email          VARCHAR(255)     NULL,
    password       VARCHAR(255)     NULL,
    user_type      user_type_enum   NOT NULL DEFAULT 'PF',
    tax_id         VARCHAR(18)      NULL,
    remember_token VARCHAR(255)     NULL,
    created_at     TIMESTAMP        NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP        NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    CONSTRAINT users_phone_unique UNIQUE (phone),
    CONSTRAINT users_email_unique UNIQUE (email)
);

-- 2. companies (depende de users)
CREATE TABLE IF NOT EXISTS companies (
    id         SERIAL       NOT NULL,
    name       VARCHAR(255) NOT NULL,
    cnpj       VARCHAR(18)  NULL,
    email      VARCHAR(255) NULL,
    phone      VARCHAR(255) NULL,
    address    TEXT         NULL,
    user_id    INTEGER      NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    UNIQUE (cnpj),
    CONSTRAINT fk_companies_user FOREIGN KEY (user_id) REFERENCES users (id)
);

-- 3. categories (depende de users)
CREATE TABLE IF NOT EXISTS categories (
    id         SERIAL              NOT NULL,
    name       VARCHAR(255)        NOT NULL,
    type       category_type_enum  NOT NULL,
    is_default BOOLEAN             NOT NULL DEFAULT FALSE,
    is_company BOOLEAN             NOT NULL DEFAULT FALSE,
    user_id    INTEGER             NULL,
    created_at TIMESTAMP           NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP           NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    CONSTRAINT fk_categories_user FOREIGN KEY (user_id) REFERENCES users (id)
);

-- 4. transactions (depende de categories, users e companies)
CREATE TABLE IF NOT EXISTS transactions (
    id          SERIAL                 NOT NULL,
    type        transaction_type_enum  NOT NULL,
    amount      DECIMAL(10, 2)         NOT NULL,
    description VARCHAR(255)           NULL,
    category_id INTEGER                NOT NULL,
    user_id     INTEGER                NULL,
    company_id  INTEGER                NULL,
    date        DATE                   NOT NULL DEFAULT CURRENT_DATE,
    created_at  TIMESTAMP              NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP              NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    CONSTRAINT fk_transactions_category FOREIGN KEY (category_id) REFERENCES categories (id),
    CONSTRAINT fk_transactions_user     FOREIGN KEY (user_id)     REFERENCES users (id),
    CONSTRAINT fk_transactions_company  FOREIGN KEY (company_id)  REFERENCES companies (id)
);

-- 5. sessions (depende de users)
CREATE TABLE IF NOT EXISTS sessions (
    id         SERIAL       NOT NULL,
    user_id    INTEGER      NOT NULL,
    token      VARCHAR(512) NOT NULL,
    expires_at TIMESTAMP    NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    UNIQUE (token),
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (id)
);

-- 6. password_reset_tokens (depende de users)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id         SERIAL       NOT NULL,
    user_id    INTEGER      NOT NULL,
    token      VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP    NOT NULL,
    used       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    UNIQUE (token),
    CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users (id)
);

-- 7. email_queue (sem dependências)
CREATE TABLE IF NOT EXISTS email_queue (
    id            SERIAL           NOT NULL,
    to_email      VARCHAR(255)     NOT NULL,
    subject       VARCHAR(255)     NOT NULL,
    body          TEXT             NOT NULL,
    status        email_status_enum NOT NULL DEFAULT 'pending',
    attempts      SMALLINT         NOT NULL DEFAULT 0,
    error_message TEXT             NULL,
    created_at    TIMESTAMP        NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP        NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id)
);

-- 8. plans (sem dependências)
CREATE TABLE IF NOT EXISTS plans (
    id                          SERIAL         NOT NULL,
    name                        plan_name_enum NOT NULL,
    display_name                VARCHAR(255)   NOT NULL,
    price_brl                   DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    max_transactions_per_month  INTEGER        NOT NULL DEFAULT 50,
    max_companies               INTEGER        NOT NULL DEFAULT 1,
    whatsapp_reports            BOOLEAN        NOT NULL DEFAULT FALSE,
    pdf_export                  BOOLEAN        NOT NULL DEFAULT FALSE,
    multi_user                  BOOLEAN        NOT NULL DEFAULT FALSE,
    recurring_transactions      BOOLEAN        NOT NULL DEFAULT FALSE,
    category_budgets            BOOLEAN        NOT NULL DEFAULT FALSE,
    is_active                   BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at                  TIMESTAMP      NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP      NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    UNIQUE (name)
);

-- 9. subscriptions (depende de users e plans)
CREATE TABLE IF NOT EXISTS subscriptions (
    id                       SERIAL                   NOT NULL,
    user_id                  INTEGER                  NOT NULL,
    plan_id                  INTEGER                  NOT NULL,
    status                   subscription_status_enum NOT NULL DEFAULT 'active',
    starts_at                TIMESTAMP                NOT NULL DEFAULT NOW(),
    expires_at               TIMESTAMP                NULL,
    payment_provider         payment_provider_enum    NOT NULL DEFAULT 'manual',
    external_subscription_id VARCHAR(255)             NULL,
    billing_url              TEXT                     NULL,
    created_at               TIMESTAMP                NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMP                NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES plans (id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions (user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_renewal     ON subscriptions (status, payment_provider, expires_at);

-- 10. recurring_transactions (depende de users, companies e categories)
CREATE TABLE IF NOT EXISTS recurring_transactions (
    id          SERIAL                NOT NULL,
    type        transaction_type_enum NOT NULL,
    amount      DECIMAL(10, 2)        NOT NULL,
    description VARCHAR(255)          NULL,
    category_id INTEGER               NOT NULL,
    user_id     INTEGER               NULL,
    company_id  INTEGER               NULL,
    frequency   frequency_enum        NOT NULL,
    next_date   DATE                  NOT NULL,
    is_active   BOOLEAN               NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP             NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP             NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    CONSTRAINT fk_recurring_category FOREIGN KEY (category_id) REFERENCES categories (id),
    CONSTRAINT fk_recurring_user     FOREIGN KEY (user_id)     REFERENCES users (id),
    CONSTRAINT fk_recurring_company  FOREIGN KEY (company_id)  REFERENCES companies (id)
);

CREATE INDEX IF NOT EXISTS idx_recurring_due ON recurring_transactions (is_active, next_date);

-- 11. category_budgets (depende de users e categories)
CREATE TABLE IF NOT EXISTS category_budgets (
    id          SERIAL         NOT NULL,
    user_id     INTEGER        NOT NULL,
    category_id INTEGER        NOT NULL,
    amount      DECIMAL(10, 2) NOT NULL,
    month       VARCHAR(7)     NOT NULL, -- format: YYYY-MM
    created_at  TIMESTAMP      NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP      NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    UNIQUE (user_id, category_id, month),
    CONSTRAINT fk_category_budgets_user     FOREIGN KEY (user_id)     REFERENCES users (id),
    CONSTRAINT fk_category_budgets_category FOREIGN KEY (category_id) REFERENCES categories (id)
);

CREATE INDEX IF NOT EXISTS idx_category_budgets_user_month ON category_budgets (user_id, month);

-- migration: adiciona coluna category_budgets ao plans (seguro para banco existente)
ALTER TABLE plans ADD COLUMN IF NOT EXISTS category_budgets BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── Open Banking migrations ──────────────────────────────────────────────────

-- migration: adiciona source e external_id em transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source      VARCHAR(20)  NOT NULL DEFAULT 'manual';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS external_id VARCHAR(255) NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_external_id
  ON transactions (external_id) WHERE external_id IS NOT NULL;

-- 12. bank_connections (depende de users)
CREATE TABLE IF NOT EXISTS bank_connections (
    id               SERIAL       NOT NULL,
    user_id          INTEGER      NOT NULL,
    pluggy_item_id   VARCHAR(255) NOT NULL,
    institution_name VARCHAR(255) NULL,
    institution_id   VARCHAR(50)  NULL,
    status           VARCHAR(50)  NOT NULL DEFAULT 'pending',
    last_sync_at     TIMESTAMP    NULL,
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    CONSTRAINT fk_bank_connections_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bank_connections_user   ON bank_connections (user_id);
CREATE INDEX IF NOT EXISTS idx_bank_connections_status ON bank_connections (status);

-- 13. bank_accounts (depende de bank_connections e users)
CREATE TABLE IF NOT EXISTS bank_accounts (
    id                  SERIAL         NOT NULL,
    bank_connection_id  INTEGER        NOT NULL,
    user_id             INTEGER        NOT NULL,
    pluggy_account_id   VARCHAR(255)   NOT NULL,
    name                VARCHAR(255)   NULL,
    type                VARCHAR(50)    NULL,
    balance             DECIMAL(12, 2) NULL,
    currency_code       VARCHAR(10)    NOT NULL DEFAULT 'BRL',
    created_at          TIMESTAMP      NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP      NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    UNIQUE (pluggy_account_id),
    CONSTRAINT fk_bank_accounts_connection FOREIGN KEY (bank_connection_id) REFERENCES bank_connections (id) ON DELETE CASCADE,
    CONSTRAINT fk_bank_accounts_user       FOREIGN KEY (user_id)            REFERENCES users (id)            ON DELETE CASCADE
);

-- migration: adiciona open_banking ao plans
ALTER TABLE plans ADD COLUMN IF NOT EXISTS open_banking BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- Seed: planos padrão
-- ============================================================

INSERT INTO plans (name, display_name, price_brl, max_transactions_per_month, max_companies, whatsapp_reports, pdf_export, multi_user, recurring_transactions, category_budgets, open_banking)
VALUES
    ('free',     'Grátis',    0.00,  50,  1, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
    ('pro',      'Pro',       29.90, -1,  5, TRUE,  TRUE,  FALSE, TRUE,  TRUE,  TRUE),
    ('business', 'Business',  79.90, -1, -1, TRUE,  TRUE,  TRUE,  TRUE,  TRUE,  TRUE)
ON CONFLICT (name) DO UPDATE SET
    display_name           = EXCLUDED.display_name,
    price_brl              = EXCLUDED.price_brl,
    whatsapp_reports       = EXCLUDED.whatsapp_reports,
    pdf_export             = EXCLUDED.pdf_export,
    multi_user             = EXCLUDED.multi_user,
    recurring_transactions = EXCLUDED.recurring_transactions,
    category_budgets       = EXCLUDED.category_budgets,
    open_banking           = EXCLUDED.open_banking;

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
