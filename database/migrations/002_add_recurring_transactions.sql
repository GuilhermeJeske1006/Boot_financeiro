-- ============================================================
-- Migration 002 — Transações Recorrentes
-- Execute apenas em bancos já existentes
-- ============================================================

-- 1. Adiciona coluna recurring_transactions na tabela plans (se não existir)
ALTER TABLE plans
    ADD COLUMN IF NOT EXISTS recurring_transactions TINYINT(1) NOT NULL DEFAULT 0
        COMMENT 'Feature: transações recorrentes (Pro/Business)';

-- 2. Atualiza os planos com os novos valores de feature
UPDATE plans SET recurring_transactions = 0 WHERE name = 'free';
UPDATE plans SET recurring_transactions = 1 WHERE name = 'pro';
UPDATE plans SET recurring_transactions = 1 WHERE name = 'business';

-- 3. Cria a tabela recurring_transactions
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
