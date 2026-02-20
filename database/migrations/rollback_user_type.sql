-- Rollback da migration add_user_type.sql

-- Remover índice
ALTER TABLE users DROP INDEX idx_users_user_type;

-- Remover campo user_type
ALTER TABLE users DROP COLUMN user_type;

-- Verificar estrutura
DESCRIBE users;
