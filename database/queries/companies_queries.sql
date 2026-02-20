-- Exemplos de queries úteis para gerenciar empresas e transações

-- 1. Listar todas as empresas de um usuário
SELECT * FROM companies WHERE user_id = ?;

-- 2. Buscar empresa por CNPJ
SELECT * FROM companies WHERE cnpj = ?;

-- 3. Listar transações pessoais de um usuário
SELECT t.*, c.name as category_name 
FROM transactions t
JOIN categories c ON t.category_id = c.id
WHERE t.user_id = ? AND t.company_id IS NULL
ORDER BY t.date DESC;

-- 4. Listar transações de uma empresa específica
SELECT t.*, c.name as category_name, co.name as company_name
FROM transactions t
JOIN categories c ON t.category_id = c.id
JOIN companies co ON t.company_id = co.id
WHERE t.company_id = ?
ORDER BY t.date DESC;

-- 5. Relatório mensal pessoal (resumo por categoria)
SELECT 
    t.type,
    c.name as category_name,
    SUM(t.amount) as total
FROM transactions t
JOIN categories c ON t.category_id = c.id
WHERE t.user_id = ?
    AND t.company_id IS NULL
    AND t.date BETWEEN ? AND ?
GROUP BY t.type, c.id, c.name;

-- 6. Relatório mensal por empresa (resumo por categoria)
SELECT 
    t.type,
    c.name as category_name,
    SUM(t.amount) as total
FROM transactions t
JOIN categories c ON t.category_id = c.id
WHERE t.company_id = ?
    AND t.date BETWEEN ? AND ?
GROUP BY t.type, c.id, c.name;

-- 7. Resumo geral de todas as empresas de um usuário
SELECT 
    co.id,
    co.name as company_name,
    co.cnpj,
    COUNT(t.id) as total_transactions,
    SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as total_income,
    SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as total_expense,
    SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END) as balance
FROM companies co
LEFT JOIN transactions t ON co.id = t.company_id
WHERE co.user_id = ?
GROUP BY co.id, co.name, co.cnpj;

-- 8. Verificar integridade dos dados (transações que têm ambos user_id e company_id - NÃO deve retornar nada)
SELECT * FROM transactions WHERE user_id IS NOT NULL AND company_id IS NOT NULL;

-- 9. Verificar integridade dos dados (transações que não têm nem user_id nem company_id - NÃO deve retornar nada)
SELECT * FROM transactions WHERE user_id IS NULL AND company_id IS NULL;

-- 10. Estatísticas gerais por tipo de transação
SELECT 
    CASE 
        WHEN user_id IS NOT NULL THEN 'Pessoal'
        WHEN company_id IS NOT NULL THEN 'Empresarial'
    END as transaction_type,
    COUNT(*) as total_count,
    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense
FROM transactions
GROUP BY 
    CASE 
        WHEN user_id IS NOT NULL THEN 'Pessoal'
        WHEN company_id IS NOT NULL THEN 'Empresarial'
    END;
