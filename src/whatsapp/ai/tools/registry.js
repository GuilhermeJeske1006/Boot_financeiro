const TOOLS = [
  // ─── TRANSAÇÕES ───────────────────────────────────────────────────────────
  {
    name: 'create_transaction',
    description:
      'Registra entrada ou saída de dinheiro. Use para qualquer frase que implique gasto, compra, pagamento, receita, salário, freelance, transferência recebida.',
    input_schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['income', 'expense'],
          description: 'income = entrada de dinheiro, expense = saída de dinheiro',
        },
        amount: {
          type: 'number',
          description: 'Valor em reais. Normalize: "50 conto" → 50, "1.500" → 1500, "R$ 89,90" → 89.90',
        },
        description: {
          type: 'string',
          description: 'Descrição opcional da transação',
        },
        category_name: {
          type: 'string',
          description: 'Nome aproximado da categoria. Será resolvido para o match mais próximo.',
        },
        date: {
          type: 'string',
          description: 'Data no formato YYYY-MM-DD. Omitir = hoje.',
        },
      },
      required: ['type', 'amount'],
    },
  },
  {
    name: 'list_transactions',
    description:
      'Lista transações do usuário. Use quando pedir "minhas transações", "últimos gastos", "o que gastei em X", etc.',
    input_schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Quantidade de registros. Padrão: 10',
        },
        type: {
          type: 'string',
          enum: ['income', 'expense', 'all'],
          description: 'Filtrar por tipo. Padrão: all',
        },
        month: {
          type: 'number',
          description: 'Mês (1-12). Omitir = mês atual',
        },
        year: {
          type: 'number',
          description: 'Ano com 4 dígitos. Omitir = ano atual',
        },
        category_name: {
          type: 'string',
          description: 'Filtrar por categoria (nome aproximado)',
        },
      },
      required: [],
    },
  },
  {
    name: 'edit_transaction',
    description:
      'Edita uma transação existente. Use quando o usuário quiser corrigir um valor, descrição, categoria ou data. Pode buscar por ID ou descrição aproximada.',
    input_schema: {
      type: 'object',
      properties: {
        transaction_id: {
          type: 'number',
          description: 'ID numérico da transação, se conhecido',
        },
        search_description: {
          type: 'string',
          description: 'Se não souber o ID, descreva a transação para busca',
        },
        amount: {
          type: 'number',
          description: 'Novo valor em reais',
        },
        description: {
          type: 'string',
          description: 'Nova descrição',
        },
        category_name: {
          type: 'string',
          description: 'Nome da nova categoria',
        },
        date: {
          type: 'string',
          description: 'Nova data no formato YYYY-MM-DD',
        },
      },
      required: [],
    },
  },
  {
    name: 'delete_transaction',
    description:
      'Remove uma transação permanentemente. AÇÃO DESTRUTIVA — o sistema pedirá confirmação automática. Use apenas quando o usuário pedir explicitamente para deletar/remover/cancelar uma transação.',
    input_schema: {
      type: 'object',
      properties: {
        transaction_id: {
          type: 'number',
          description: 'ID numérico da transação',
        },
        search_description: {
          type: 'string',
          description: 'Descrição aproximada para buscar a transação',
        },
      },
      required: [],
    },
  },

  // ─── SALDO E RELATÓRIOS ───────────────────────────────────────────────────
  {
    name: 'get_balance',
    description:
      'Retorna saldo do mês atual: total de receitas, despesas e saldo líquido. Use para "qual meu saldo", "como estou no mês", "quanto gastei esse mês".',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_monthly_report',
    description:
      'Retorna relatório detalhado de um mês: receitas e despesas por categoria, saldo e comparação com mês anterior. Use para "relatório de maio", "como foi fevereiro", "resumo do mês passado".',
    input_schema: {
      type: 'object',
      properties: {
        month: {
          type: 'number',
          description: 'Mês (1-12). Omitir = mês atual',
        },
        year: {
          type: 'number',
          description: 'Ano com 4 dígitos. Omitir = ano atual',
        },
      },
      required: [],
    },
  },

  // ─── METAS ────────────────────────────────────────────────────────────────
  {
    name: 'list_goals',
    description:
      'Lista metas financeiras ativas com progresso atual, valor alvo e prazo. Use para "minhas metas", "como estão minhas metas", "progresso das metas".',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'create_goal',
    description:
      'Cria nova meta financeira. Use para "quero juntar X para Y", "cria uma meta de R$ X", "meta para comprar X".',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Nome da meta (ex: Viagem, Carro, Reserva de emergência)',
        },
        target_amount: {
          type: 'number',
          description: 'Valor alvo em reais',
        },
        deadline: {
          type: 'string',
          description: 'Data limite no formato YYYY-MM-DD (opcional)',
        },
      },
      required: ['name', 'target_amount'],
    },
  },
  {
    name: 'contribute_to_goal',
    description:
      'Adiciona contribuição a uma meta financeira existente. Use para "juntei X para a meta Y", "contribui X na meta", "guardei X para Y".',
    input_schema: {
      type: 'object',
      properties: {
        goal_name: {
          type: 'string',
          description: 'Nome aproximado da meta',
        },
        goal_id: {
          type: 'number',
          description: 'ID numérico da meta, se conhecido',
        },
        amount: {
          type: 'number',
          description: 'Valor da contribuição em reais',
        },
        note: {
          type: 'string',
          description: 'Nota opcional sobre a contribuição',
        },
      },
      required: ['amount'],
    },
  },

  // ─── RECORRENTES (Pro) ────────────────────────────────────────────────────
  {
    name: 'list_recurring_transactions',
    description:
      'Lista transações recorrentes configuradas (assinaturas, salário fixo, aluguel, etc). Requer plano Pro.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'create_recurring_transaction',
    description:
      'Cria transação recorrente. Use para "Netflix todo mês", "salário toda semana", "aluguel mensal", "academia R$ X por mês". Requer plano Pro. AÇÃO COM CONFIRMAÇÃO.',
    input_schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['income', 'expense'],
          description: 'income = entrada recorrente, expense = saída recorrente',
        },
        amount: {
          type: 'number',
          description: 'Valor em reais',
        },
        description: {
          type: 'string',
          description: 'Nome/descrição da recorrente (ex: Netflix, Salário, Aluguel)',
        },
        category_name: {
          type: 'string',
          description: 'Categoria aproximada',
        },
        frequency: {
          type: 'string',
          enum: ['daily', 'weekly', 'monthly', 'yearly'],
          description: 'daily=diário, weekly=semanal, monthly=mensal, yearly=anual',
        },
        start_date: {
          type: 'string',
          description: 'Data de início no formato YYYY-MM-DD. Omitir = hoje',
        },
      },
      required: ['type', 'amount', 'frequency'],
    },
  },
  {
    name: 'delete_recurring_transaction',
    description:
      'Desativa uma transação recorrente. AÇÃO COM CONFIRMAÇÃO. Use para "cancela a Netflix das recorrentes", "remove o aluguel das recorrentes".',
    input_schema: {
      type: 'object',
      properties: {
        recurring_id: {
          type: 'number',
          description: 'ID numérico da recorrente',
        },
        search_description: {
          type: 'string',
          description: 'Descrição aproximada para buscar a recorrente',
        },
      },
      required: [],
    },
  },

  // ─── ORÇAMENTOS (Pro) ─────────────────────────────────────────────────────
  {
    name: 'list_budgets',
    description:
      'Lista orçamentos do mês atual por categoria com percentual de uso. Requer plano Pro. Use para "meus orçamentos", "quanto usei do orçamento", "estou dentro do orçamento?".',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'set_budget',
    description:
      'Define ou atualiza o orçamento mensal para uma categoria. AÇÃO COM CONFIRMAÇÃO. Requer plano Pro. Use para "define orçamento de alimentação como X", "limita X por mês em Y".',
    input_schema: {
      type: 'object',
      properties: {
        category_name: {
          type: 'string',
          description: 'Nome da categoria',
        },
        amount: {
          type: 'number',
          description: 'Limite mensal em reais',
        },
      },
      required: ['category_name', 'amount'],
    },
  },

  // ─── EXPORTAÇÃO (Pro) ─────────────────────────────────────────────────────
  {
    name: 'export_report',
    description:
      'Gera relatório financeiro em PDF ou Excel para download. AÇÃO COM CONFIRMAÇÃO. Requer plano Pro. Use para "exporta em PDF", "quero o Excel de março", "baixa o relatório".',
    input_schema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          enum: ['pdf', 'excel'],
          description: 'Formato do arquivo',
        },
        month: {
          type: 'number',
          description: 'Mês (1-12). Omitir = mês atual',
        },
        year: {
          type: 'number',
          description: 'Ano com 4 dígitos. Omitir = ano atual',
        },
      },
      required: ['format'],
    },
  },

  // ─── PERFIL E PLANO ───────────────────────────────────────────────────────
  {
    name: 'get_subscription_info',
    description:
      'Mostra plano atual, recursos disponíveis, data de vencimento e opções de upgrade. Use para "meu plano", "o que tenho no plano", "preciso fazer upgrade?".',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'update_profile',
    description:
      'Atualiza nome do usuário. Use para "muda meu nome para X", "atualiza meu nome".',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Novo nome do usuário',
        },
      },
      required: ['name'],
    },
  },
];

module.exports = TOOLS;
