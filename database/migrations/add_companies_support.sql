-- Script SQL para adicionar suporte a empresas no sistema financeiro

-- 1. Criar tabela de empresas (companies)
CREATE TABLE IF NOT EXISTS companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18) NULL UNIQUE,
  email VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  address TEXT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_companies_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_companies_user_id (user_id),
  INDEX idx_companies_cnpj (cnpj)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Adicionar campo company_id na tabela transactions
ALTER TABLE transactions 
ADD COLUMN company_id INT NULL AFTER user_id,
ADD CONSTRAINT fk_transactions_company_id FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
ADD INDEX idx_transactions_company_id (company_id);

-- 3. Modificar campo user_id para permitir NULL (agora é opcional)
ALTER TABLE transactions 
MODIFY COLUMN user_id INT NULL;

-- 4. Adicionar constraint para garantir que user_id OU company_id seja preenchido
-- Nota: MySQL não suporta CHECK constraints até versão 8.0.16+
-- Se estiver usando MySQL 8.0.16+, descomente a linha abaixo:
-- ALTER TABLE transactions ADD CONSTRAINT chk_user_or_company CHECK ((user_id IS NOT NULL AND company_id IS NULL) OR (user_id IS NULL AND company_id IS NOT NULL));

-- 5. Para versões anteriores do MySQL, a validação será feita na camada da aplicação (já implementado no model)

-- Verificar estrutura criada
DESCRIBE companies;
DESCRIBE transactions;
