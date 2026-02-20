# Scripts SQL - Suporte a Empresas

## Estrutura de Arquivos

```
database/
├── migrations/
│   ├── add_companies_support.sql        # Script principal de migração
│   └── rollback_companies_support.sql   # Script de rollback
└── queries/
    └── companies_queries.sql            # Queries úteis para consultas
```

## Como Executar as Migrations

### 1. Aplicar as mudanças (Migration)

Execute o script principal para adicionar suporte a empresas:

```bash
mysql -u seu_usuario -p nome_do_banco < database/migrations/add_companies_support.sql
```

Ou via cliente MySQL:
```sql
source database/migrations/add_companies_support.sql;
```

### 2. Reverter mudanças (Rollback)

Se precisar reverter as mudanças:

```bash
mysql -u seu_usuario -p nome_do_banco < database/migrations/rollback_companies_support.sql
```

## Alterações no Banco de Dados

### Nova Tabela: `companies`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INT | Chave primária (auto incremento) |
| name | VARCHAR(255) | Nome da empresa (obrigatório) |
| cnpj | VARCHAR(18) | CNPJ da empresa (único, opcional) |
| email | VARCHAR(255) | E-mail da empresa (opcional) |
| phone | VARCHAR(50) | Telefone da empresa (opcional) |
| address | TEXT | Endereço completo (opcional) |
| user_id | INT | FK para users - dono da empresa |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:**
- PRIMARY KEY (id)
- UNIQUE KEY (cnpj)
- INDEX (user_id)

### Alteração na Tabela: `transactions`

**Novas colunas:**
- `company_id` INT NULL - FK para companies (opcional)

**Modificações:**
- `user_id` agora permite NULL

**Constraint lógica:**
- Uma transação deve ter OU `user_id` OU `company_id` (não ambos, não nenhum)
- A validação é feita na camada da aplicação (modelo Sequelize)

## Validação de Integridade

Após executar a migration, verifique:

```sql
-- Ver estrutura da tabela companies
DESCRIBE companies;

-- Ver estrutura atualizada de transactions
DESCRIBE transactions;

-- Verificar que não há transações inválidas
SELECT * FROM transactions WHERE user_id IS NULL AND company_id IS NULL;
SELECT * FROM transactions WHERE user_id IS NOT NULL AND company_id IS NOT NULL;
```

## Observações Importantes

### MySQL Versões < 8.0.16

O MySQL anterior à versão 8.0.16 não suporta CHECK constraints. Por isso:
- A validação de que `user_id` OU `company_id` deve estar preenchido é feita no modelo Sequelize
- Se usar MySQL 8.0.16+, você pode descomentar a linha de CHECK constraint no script de migration

### Dados Existentes

- Transações antigas continuarão funcionando normalmente (têm `user_id` e `company_id` = NULL)
- Não é necessário migrar dados antigos
- Novas transações podem ser pessoais ou empresariais

### Cascade Delete

- Se uma empresa for deletada, todas suas transações serão deletadas automaticamente
- Se um usuário for deletado, todas suas empresas E transações pessoais serão deletadas

## Exemplos de Uso

### Inserir uma empresa
```sql
INSERT INTO companies (name, cnpj, email, phone, address, user_id)
VALUES ('Minha Empresa LTDA', '12.345.678/0001-90', 'contato@empresa.com', '(11) 98765-4321', 'Rua Exemplo, 123', 1);
```

### Criar transação empresarial
```sql
INSERT INTO transactions (type, amount, description, category_id, company_id, date)
VALUES ('expense', 1500.00, 'Compra de equipamentos', 5, 1, '2026-02-20');
```

### Criar transação pessoal
```sql
INSERT INTO transactions (type, amount, description, category_id, user_id, date)
VALUES ('income', 5000.00, 'Salário', 2, 1, '2026-02-20');
```

## Queries Úteis

Veja o arquivo `database/queries/companies_queries.sql` para exemplos de queries úteis incluindo:
- Listar empresas por usuário
- Relatórios mensais por empresa
- Estatísticas gerais
- E mais...
