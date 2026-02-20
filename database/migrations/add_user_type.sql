-- Migration para adicionar campo user_type na tabela users

-- Adicionar campo user_type (PF = Pessoa Física, PJ = Pessoa Jurídica)
ALTER TABLE users 
ADD COLUMN user_type ENUM('PF', 'PJ') NOT NULL DEFAULT 'PF' AFTER password;

-- Criar índice para otimizar buscas por tipo de usuário
ALTER TABLE users
ADD INDEX idx_users_user_type (user_type);

-- Verificar estrutura atualizada
DESCRIBE users;
