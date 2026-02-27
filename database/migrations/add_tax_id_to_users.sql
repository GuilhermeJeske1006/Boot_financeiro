-- ============================================================
-- Migração: Adiciona coluna tax_id (CPF/CNPJ) na tabela users
-- Execute este script se o banco já existia antes desta feature
-- ============================================================

ALTER TABLE users ADD COLUMN tax_id VARCHAR(14) NULL AFTER user_type;
