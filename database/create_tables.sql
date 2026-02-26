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
