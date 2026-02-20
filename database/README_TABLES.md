# Scripts SQL do Banco de Dados

## Estrutura de Arquivos

```
database/
├── create_tables.sql              # Script completo de criação (recomendado)
├── create_tables_individual.sql   # Apenas CREATE TABLE sem comentários
├── drop_tables.sql                # Script para dropar todas as tabelas
├── migrations/
│   ├── add_companies_support.sql        # Migration para adicionar empresas
│   └── rollback_companies_support.sql   # Rollback da migration
└── queries/
    └── companies_queries.sql            # Queries úteis
```

## Como Executar

### 1. Criar o banco de dados completo

```bash
mysql -u root -p < database/create_tables.sql
```

Ou dentro do MySQL:
```sql
source database/create_tables.sql;
```

### 2. Criar tabelas individuais

```bash
mysql -u root -p meuBancoNode < database/create_tables_individual.sql
```

### 3. Dropar todas as tabelas (CUIDADO!)

```bash
mysql -u root -p meuBancoNode < database/drop_tables.sql
```

## Estrutura das Tabelas

### 📋 **users** - Usuários do sistema
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INT | Chave primária (auto incremento) |
| name | VARCHAR(255) | Nome do usuário |
| phone | VARCHAR(50) | Telefone (único) |
| email | VARCHAR(255) | E-mail (único) |
| password | VARCHAR(255) | Senha criptografada |
| remember_token | VARCHAR(255) | Token de sessão |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

### 🏷️ **categories** - Categorias de transações
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INT | Chave primária |
| name | VARCHAR(255) | Nome da categoria |
| type | ENUM | 'income', 'expense', 'both' |
| is_default | BOOLEAN | Se é categoria padrão |
| user_id | INT | FK para users (NULL = padrão) |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

### 🏢 **companies** - Empresas
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INT | Chave primária |
| name | VARCHAR(255) | Nome da empresa |
| cnpj | VARCHAR(18) | CNPJ (único, opcional) |
| email | VARCHAR(255) | E-mail da empresa |
| phone | VARCHAR(50) | Telefone |
| address | TEXT | Endereço completo |
| user_id | INT | FK para users (dono) |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

### 💰 **transactions** - Transações
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INT | Chave primária |
| type | ENUM | 'income' ou 'expense' |
| amount | DECIMAL(10,2) | Valor da transação |
| description | VARCHAR(255) | Descrição opcional |
| category_id | INT | FK para categories |
| user_id | INT | FK para users (transação pessoal) |
| company_id | INT | FK para companies (transação empresarial) |
| date | DATE | Data da transação |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**⚠️ IMPORTANTE:** Uma transação deve ter **OU** `user_id` **OU** `company_id` (nunca ambos, nunca nenhum)

## Relacionamentos

```
users (1) ──────< categories (N)
users (1) ──────< transactions (N) [pessoais]
users (1) ──────< companies (N)
companies (1) ──< transactions (N) [empresariais]
categories (1) ──< transactions (N)
```

## Índices Criados

- **users**: email, phone
- **categories**: user_id, type
- **companies**: user_id, cnpj
- **transactions**: user_id, company_id, date, type

## Constraints (Foreign Keys)

- `categories.user_id` → `users.id` (CASCADE)
- `companies.user_id` → `users.id` (CASCADE)
- `transactions.category_id` → `categories.id` (RESTRICT)
- `transactions.user_id` → `users.id` (CASCADE)
- `transactions.company_id` → `companies.id` (CASCADE)

## Charset e Collation

Todas as tabelas usam:
- **Charset**: `utf8mb4`
- **Collation**: `utf8mb4_unicode_ci`
- **Engine**: `InnoDB`

## Observações

### MySQL 8.0.16+
Se você estiver usando MySQL 8.0.16 ou superior, pode adicionar a constraint CHECK para validar que uma transação tenha apenas user_id OU company_id:

```sql
ALTER TABLE transactions ADD CONSTRAINT chk_user_or_company 
CHECK ((user_id IS NOT NULL AND company_id IS NULL) OR 
       (user_id IS NULL AND company_id IS NOT NULL));
```

### Versões anteriores
Para versões anteriores do MySQL, a validação é feita na camada da aplicação (model Sequelize).

## Comandos Úteis

```sql
-- Ver todas as tabelas
SHOW TABLES;

-- Ver estrutura de uma tabela
DESCRIBE users;
DESCRIBE categories;
DESCRIBE companies;
DESCRIBE transactions;

-- Ver índices de uma tabela
SHOW INDEX FROM transactions;

-- Ver constraints/foreign keys
SELECT * FROM information_schema.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = 'meuBancoNode';
```
