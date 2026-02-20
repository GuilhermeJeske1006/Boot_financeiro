-- ========================================
-- SCRIPT DE DROP DAS TABELAS
-- ATENÇÃO: Isso irá apagar TODAS as tabelas e seus dados!
-- ========================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- Verificar que as tabelas foram removidas
SHOW TABLES;
