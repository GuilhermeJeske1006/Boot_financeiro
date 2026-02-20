-- Script SQL para reverter as mudanças de suporte a empresas (ROLLBACK)

-- 1. Remover constraint e índice de company_id em transactions
ALTER TABLE transactions 
DROP FOREIGN KEY fk_transactions_company_id,
DROP INDEX idx_transactions_company_id;

-- 2. Remover coluna company_id de transactions
ALTER TABLE transactions 
DROP COLUMN company_id;

-- 3. Restaurar user_id como NOT NULL em transactions
ALTER TABLE transactions 
MODIFY COLUMN user_id INT NOT NULL;

-- 4. Remover tabela companies (isso também remove todas as empresas cadastradas)
DROP TABLE IF EXISTS companies;

-- Verificar que as mudanças foram revertidas
DESCRIBE transactions;
SHOW TABLES LIKE 'companies';
