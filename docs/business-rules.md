# Regras de Negócio — Fase 1 a Fase 7

> Cobre as regras críticas necessárias para tarefas, hábitos, XP (Fase 1),
> peso/IMC/água/alimentação/treino (Fase 2), devocional/estudo bíblico/
> plano de leitura/orações/versículos (Fase 3), contas/transações/
> categorias/orçamentos/recorrências (Fase 4), clientes/leads/catálogo/
> ofertas/vendas/estoque/indicadores empresariais (Fase 5), dashboard
> consolidado/revisão semanal/metas trimestrais/recompensas/conquistas/
> busca global (Fase 6) e notificações push/preferências/quiet
> hours/jobs agendados/resumo diário/resumo semanal (Fase 7). Toda regra
> aqui descrita precisa ter teste unitário correspondente antes da fase
> respectiva ser considerada concluída (gate da fase, ver `roadmap.md`).

## 1. XP — regra crítica de idempotência

### 1.1 Princípio

**XP nunca pode ser concedido duas vezes para o mesmo evento.** Se o usuário
marcar uma tarefa, desmarcar e marcar novamente, ou clicar duas vezes no
botão de concluir, o resultado final deve ser exatamente o mesmo XP que uma
única conclusão válida geraria.

A garantia é do **banco de dados**, nunca só do frontend. O frontend pode
(e deve) desabilitar o botão durante o submit para dar feedback, mas isso é
UX, não a proteção real.

### 1.2 Mecanismo

Todo ganho de XP é um registro imutável em `xp_events` (ver `database.md`).
Nunca existe um campo `user.xp` incrementado diretamente por múltiplas
chamadas — o total de XP é sempre a soma (ou soma agregada por período) de
`xp_events`.

Cada evento tem um `source_key` determinístico, derivado da entidade e,
quando aplicável, da data:

| evento | `source_key` |
|---|---|
| Tarefa concluída | `TASK_COMPLETED:{task_id}` |
| Hábito concluído em um dia | `HABIT:{habit_id}:{date}` |
| Peso registrado (1x/semana ISO) | `WEIGHT_LOGGED:{iso_year}-W{iso_week}` |
| Meta diária de água atingida | `WATER_GOAL:{date}` |
| Refeição planejada marcada "realizada" | `MEAL_PLAN_ADHERENCE:{meal_plan_id}:{date}` |
| Treino concluído | `WORKOUT_COMPLETED:{workout_session_id}` |
| Caminhada registrada (1x/dia) | `WALK_LOGGED:{date}` |
| Devocional do dia (checklist completo) | `DEVOTIONAL:{date}` |
| Dia do plano de leitura concluído | `READING_PLAN:{reading_plan_id}:{day_number}` |

A tabela `xp_events` tem `UNIQUE(user_id, source_key)`. Qualquer tentativa
de inserir um evento com a mesma `source_key` para o mesmo usuário falha por
violação de constraint — essa é a idempotência real.

### 1.3 Fluxo de concluir tarefa

1. Usuário marca tarefa como concluída na UI.
2. Service `tasks.completeTask(taskId)`:
   - atualiza `tasks.status = 'concluida'` e `completed_at = now()`;
   - tenta inserir em `xp_events` com `source_key = TASK_COMPLETED:{task_id}`
     e `xp_amount = tasks.xp_reward`;
   - se a inserção falhar por conflito de `UNIQUE`, a operação de completar
     a tarefa **ainda é bem-sucedida** (idempotente), mas nenhum XP novo é
     concedido nem retornado como "ganho" nessa chamada.
3. Ambas as operações (update da tarefa + insert do evento) acontecem numa
   única transação/RPC — não como duas chamadas soltas do cliente, para
   evitar estado inconsistente se uma falhar no meio.

### 1.4 Desmarcar e remarcar tarefa

- Desmarcar uma tarefa (`status` volta para `pendente`) **não remove** o
  `xp_event` já concedido. XP concedido não é revogado retroativamente —
  evita lógica de "dívida de XP" e mantém o histórico de eventos imutável.
- Remarcar como concluída tenta inserir o mesmo `source_key`
  (`TASK_COMPLETED:{task_id}`) novamente, que é bloqueado pela constraint —
  portanto **nenhum XP adicional é gerado** na segunda conclusão.
- Consequência aceita e desejada: um usuário não consegue "farmar" XP
  desmarcando/remarcando repetidamente a mesma tarefa.

### 1.5 Hábitos

- `source_key = HABIT:{habit_id}:{date}` — a granularidade é por dia, não
  por clique. Marcar o mesmo hábito várias vezes no mesmo dia gera no máximo
  um `xp_event`.
- `date` é a data **local do usuário** (baseada em `profiles.timezone`),
  nunca a data UTC do servidor, para não haver deslocamento de dia perto da
  meia-noite.
- Desmarcar o hábito no mesmo dia remove o `habit_log` daquele dia (via
  `UNIQUE(habit_id, date)` em `habit_logs`, que também identifica se já
  existe execução), mas — mesma regra do item 1.4 — o `xp_event` já gerado
  não é revertido. Remarcar no mesmo dia não gera novo evento.

### 1.6 XP nunca é negativo

Não existe conceito de "punição" ou XP negativo por falhar uma tarefa/hábito
ou por desmarcar algo. `xp_events.xp_amount` tem constraint `> 0`. A ausência
de ação simplesmente não gera evento — ela nunca subtrai.

## 2. Cálculo de XP diário/semanal/total

- **XP total**: soma de `xp_amount` em todos os `xp_events` do usuário.
- **XP diário**: soma de `xp_amount` onde `created_at` (convertido para o
  timezone do usuário) cai no dia em questão.
- **XP semanal**: soma de `xp_amount` no intervalo da semana corrente,
  calculado a partir de `profiles.week_start` (ou do override em
  `weekly_plans.weekly_xp_goal`/período, quando existir para aquela semana).
  Início de semana **nunca é hardcoded** como segunda-feira — sempre lê a
  configuração do usuário.
- **Progresso da meta semanal**: `xp_semanal / weekly_xp_goal`, limitado a
  no máximo 100% na exibição de "meta concluída" (mas o valor bruto de XP
  continua sendo mostrado normalmente, ex.: "780/700" é uma meta batida, não
  um erro).
- Nível é derivado do XP total por uma função de progressão a definir na
  implementação (ex.: curva incremental); a fórmula exata entra neste
  documento quando implementada, com teste unitário cobrindo os limiares.

## 3. Streaks de hábito

### 3.1 Por que é calculado, não armazenado

Streak (sequência atual) e melhor streak (recorde) são **derivados** de
`habit_logs`, nunca um contador incrementado manualmente. Um contador solto
divergiria do histórico real sempre que um log fosse editado, apagado
retroativamente ou a frequência do hábito mudasse.

### 3.2 Regra para hábito diário (`frequency = 'diaria'`)

- Streak atual = número de dias consecutivos, terminando hoje **ou ontem**
  (para não zerar o streak antes de o usuário ter chance de registrar o dia
  atual), em que existe um `habit_log` para aquele hábito.
- Um único dia sem log quebra o streak — o próximo dia registrado reinicia a
  contagem em 1.
- Melhor streak = a maior sequência de dias consecutivos com log já
  observada no histórico completo do hábito.

### 3.3 Regra para hábito com dias específicos (`frequency = 'dias_da_semana'`)

- A sequência é calculada apenas sobre os dias em que o hábito é esperado
  (`days_of_week`). Dias fora da programação não contam a favor nem contra.
- Exemplo: hábito programado para seg/qua/sex. Se há log em todas as
  segundas, quartas e sextas de duas semanas seguidas, o streak é 6
  (ocorrências esperadas cumpridas em sequência), independentemente de
  terça/quinta/fim de semana não terem log.
- Faltar em um dia esperado (sem log naquele dia programado, já tendo
  passado o dia) quebra a sequência.

### 3.4 Taxa de conclusão

`taxa_conclusao = dias_com_log_no_periodo / dias_esperados_no_periodo`, onde
"dias esperados" respeita `frequency`/`days_of_week` e o período de análise
(ex.: últimos 7/30 dias, ou desde a criação do hábito se for mais recente).
Nunca dividir por zero: se `dias_esperados_no_periodo = 0` (ex.: hábito
criado hoje, período de 7 dias ainda não teve nenhuma ocorrência esperada),
a taxa é exibida como "sem dados" em vez de `NaN`/`Infinity`.

## 4. Tarefas recorrentes

- Uma recorrência (`task_recurrences`) nunca sobrescreve a tarefa anterior.
  Cada ocorrência é uma linha própria em `tasks`, ligada por
  `recurrence_id`, preservando o histórico de conclusões passadas mesmo que
  a regra de recorrência mude no futuro.
- Constraint `UNIQUE(recurrence_id, due_date)` impede gerar a mesma
  ocorrência duas vezes (ex.: se o job de geração rodar mais de uma vez).
- Cancelar/editar uma ocorrência específica não altera as demais.

## 5. Double-submit / idempotência de UI

- Toda ação que gera efeito importante (concluir tarefa, concluir hábito,
  Quick Capture) desabilita o controle/mostra estado de carregamento durante
  a chamada, para reduzir a chance de disparo duplicado.
- Essa proteção de UI é complementar, não substitui as constraints `UNIQUE`
  descritas nas seções 1 e 4, que são a garantia real.

## 6. Testes obrigatórios da Fase 1

Conforme `SPEC-ORIGINAL.md` (seção "Testes unitários obrigatórios") e o gate
da Fase 1:

- Cálculo de XP (diário, semanal, total).
- Prevenção de XP duplicado (marcar/desmarcar/remarcar tarefa e hábito).
- Cálculo de streak atual e melhor streak (diário e dias específicos).
- Taxa de conclusão de hábito, incluindo caso de denominador zero.
- Geração de ocorrências de tarefa recorrente sem duplicar.
- Teste de integração: usuário A não acessa/gera XP em dados do usuário B
  (RLS).

## 7. XP de Saúde — nunca premiar o resultado, só o comportamento

O produto **nunca** concede XP diretamente por perda/ganho de peso (ex.:
"-1kg = +100 XP" é proibido). XP de saúde só recompensa comportamentos
consistentes, com os valores fixos abaixo (ver tabela de `source_key` na
seção 1.2):

| comportamento | XP | granularidade |
|---|---|---|
| Registrar peso | +5 | no máximo 1x por semana ISO (não por registro) |
| Meta diária de água atingida | +10 | 1x por dia, no momento em que o total do dia cruza a meta |
| Refeição planejada marcada "realizada" | +20 | por refeição, por dia (não por "salvar o plano") |
| Treino concluído | +30 | por sessão de treino |
| Caminhada registrada | +15 | no máximo 1x por dia |

Todas seguem a mesma garantia da seção 1: `xp_events` com
`UNIQUE(user_id, source_key)`, concedido dentro da mesma RPC transacional que
grava o dado de origem (`log_weight`, `log_water`, `set_meal_log_status`,
`complete_workout_session`, `log_walk`). Mudar de ideia depois (ex.: marcar
uma refeição como "parcial" após já ter marcado "realizada" no mesmo dia)
**não revoga** o XP já concedido — mesma regra 1.4 dos hábitos.

## 8. IMC (índice de massa corporal)

Fórmula: `IMC = peso_kg / (altura_m * altura_m)`, com `altura_m = altura_cm / 100`.

Regras de validação (`src/domains/health/utils/bmi.ts`, ver testes
unitários com valores conhecidos):

- `peso_kg` precisa estar em `(0, 500)` e `altura_cm` em `(0, 300)` — fora
  desse intervalo é "valor impossível" e a função lança erro em vez de
  calcular (nunca divide por altura `<= 0`, então nunca gera `NaN`/`Infinity`
  mesmo com entrada inválida, porque a validação acontece antes da divisão).
- O resultado nunca é tratado como diagnóstico médico: a UI sempre mostra um
  aviso curto de que IMC é um indicador geral e não mede composição
  corporal diretamente.
- Categorias (adulto, referência OMS, só para exibição, não é conselho
  médico): `< 18.5` abaixo do peso, `18.5–24.9` peso normal, `25–29.9`
  sobrepeso, `>= 30` obesidade.
- Salvar o cálculo em `bmi_records` é opcional (opt-in) — calcular não exige
  salvar.

## 9. Peso — histórico e meta

- Cada registro em `weight_logs` é imutável e histórico (sem policy de
  UPDATE) — "corrigir" um peso é apagar e criar um novo registro, nunca
  editar in-place.
- Tendência de peso é calculada comparando a **média móvel** dos últimos N
  registros contra o período anterior, nunca o delta entre dois pontos
  isolados — evita superestimar o significado de uma variação de um único
  dia (retenção de líquido, horário da pesagem etc.). Ver
  `src/domains/health/utils/weight-trend.ts`.
- Só existe uma meta de peso ativa por vez (`weight_goals`, índice único
  parcial `where is_active`); trocar de meta desativa a anterior
  atomicamente via RPC `set_weight_goal`.

## 10. Água — meta diária e log por evento

- `water_logs` é um log por evento (nunca um contador mutável único) — cada
  "+250ml"/"+500ml"/valor customizado é uma linha própria.
- A meta do dia é recalculada a cada log via a RPC `log_water`: soma
  `amount_ml` do dia e compara com `water_settings.daily_goal_ml` (padrão
  2000ml se o usuário nunca configurou). O retorno inclui `goal_reached`,
  que a UI usa para não agendar mais lembretes de água naquele dia — a
  decisão de "atingiu a meta" é sempre tomada no banco, nunca recalculada
  solta no client.
- XP de água (+10) é concedido a única vez por dia, no exato log que faz o
  total cruzar a meta (não em cada log subsequente).

## 11. Alimentação — adesão, não contagem calórica

- `meal_plans` são refeições planejadas recorrentes (Café da manhã, Almoço,
  Lanche, Jantar, Ceia, ou nomes livres). Calorias/proteína/carboidrato/
  gordura são sempre opcionais — nunca obrigatórios no formulário.
- `meal_logs` guarda o status do dia (`realizada`, `parcial`,
  `nao_realizada`) via upsert idempotente (`UNIQUE(meal_plan_id, date)`),
  RPC `set_meal_log_status`. Reenviar o mesmo status não duplica linha nem
  XP.
- Adesão semanal = dias com pelo menos uma refeição "realizada" (ou, por
  refeição individual, refeições "realizada" sobre refeições planejadas no
  período) — calculado em `src/domains/nutrition/utils/adherence.ts`, nunca
  dividindo por zero (mesmo padrão de `computeCompletionRate` da Fase 1:
  denominador 0 retorna `null`/"sem dados", não `NaN`).

## 12. Treino — plano, sessão e séries

- Plano (`workout_plans`/`workout_exercises`) é editado com calma; execução
  (`workout_sessions`/`exercise_sets`) precisa ser rápida no celular —
  poucos campos por série (carga, repetições).
- `complete_workout_session` é a única ação que gera XP (+30). Iniciar uma
  sessão ou registrar séries não gera XP — evita incentivar abrir/fechar
  sessões repetidamente para "farmar" XP.
- Concluir uma sessão já concluída não duplica XP nem sobrescreve
  `completed_at` (idempotente: se já houver `completed_at`, a RPC mantém o
  valor original e ainda assim tenta o insert de XP, que é bloqueado pela
  constraint).
- "Última carga"/"melhor desempenho"/"volume" por exercício são sempre
  **calculados** a partir de `exercise_sets` (nunca coluna mutável
  denormalizada) — mesma filosofia de streaks de hábito. Ver
  `src/domains/workouts/utils/volume.ts`.

## 13. Testes obrigatórios da Fase 2

Conforme `SPEC-ORIGINAL.md` e o gate da Fase 2 (`roadmap.md`):

- IMC: fórmula com valores conhecidos, validação de peso/altura impossíveis,
  garantia de nunca retornar `NaN`/`Infinity`.
- Tendência de peso: não superestimar variação de um único dia.
- Taxa de adesão alimentar, incluindo caso de denominador zero.
- Cálculo de volume/melhor desempenho de treino.
- XP de saúde nunca duplicado (peso semanal, água diária, refeição por dia,
  treino por sessão, caminhada diária) — unitário (RPC simulada) e teste de
  integração contra o banco real.
- Teste de integração: usuário A não acessa/gera XP em dados de saúde do
  usuário B (RLS).

## 14. XP espiritual — nunca transformar espiritualidade em pontuação

Diferente das demais fases, o espiritual é tratado com XP **deliberadamente
modesto e restrito a dois comportamentos apenas** — não existe XP por criar
nota de estudo, salvar versículo ou registrar oração, porque essas são
ações de registro pessoal, não "missões" a cumprir:

| comportamento | XP | granularidade |
|---|---|---|
| Devocional do dia com checklist completo (leu + refletiu + orou) | +10 | 1x por dia — texto sozinho sem marcar o checklist não gera XP |
| Dia do plano de leitura concluído | +10 | 1x por dia do plano (`UNIQUE(reading_plan_id, day_number)`) |

Mesma garantia da seção 1: `xp_events` com `UNIQUE(user_id, source_key)`,
concedido dentro da mesma RPC que grava o dado de origem (`log_devotional`,
`complete_reading_day`). Preencher só uma parte do checklist do devocional
(ex.: só "leu") não gera XP — evita reduzir devocional a "abrir e fechar
para ganhar pontos".

## 15. Devocional — um registro por dia, editável

- `UNIQUE(user_id, date)` em `devotionals`: reenviar o mesmo dia faz
  **upsert** (a RPC `log_devotional` atualiza o registro existente), nunca
  cria um segundo. Diferente de `weight_logs`, aqui a edição do mesmo dia é
  esperada (o usuário pode preencher a reflexão de manhã e a oração à
  noite).
- Streak de constância é **calculado**, nunca armazenado — reaproveita a
  mesma função pura de streak de hábitos (`shared/lib/streak.ts`,
  frequência `diaria`), promovida para `shared/lib` nesta fase por já ser
  usada por dois domínios (ver `docs/architecture.md`).

## 16. Plano de leitura — progresso e streak

- Progresso (`dias concluídos / total`) é calculado a partir de
  `reading_plan_logs`, nunca uma coluna mutável em `reading_plans`.
- `UNIQUE(reading_plan_id, day_number)` garante que o mesmo dia do plano
  nunca é concluído duas vezes — reenviar a mesma conclusão é idempotente
  tanto para o log quanto para o XP.
- Streak do plano usa a mesma função pura de `shared/lib/streak.ts` sobre as
  datas (`date`) dos logs, frequência `diaria`.
- A estrutura (`reading_plans.source`/`template_key`) já comporta planos
  predefinidos no futuro, mas nenhum catálogo de planos predefinidos é
  criado nesta fase — só quando esse recurso for implementado de verdade
  (ver `docs/architecture.md`, decisão "Modelagem de treino simplificada"
  para o mesmo princípio aplicado aqui).

## 17. Orações — transição de status, não novo registro

- Transformar um "pedido" em "oração respondida" é um `UPDATE` no mesmo
  registro (`type = 'respondida'`, `answered_at` preenchido) — nunca um
  novo registro. O histórico (quando foi pedido, quando foi respondida)
  fica nas próprias colunas `requested_at`/`answered_at`/`updated_at`.
- Constraint `check (type <> 'respondida' or answered_at is not null)`
  impede marcar como respondida sem registrar quando.

## 18. Busca espiritual — nunca uma query insegura

A busca por livro/capítulo/versículo/palavra/tag roda contra
`bible_study_notes` e `saved_verses` via chamadas parametrizadas do SDK do
Supabase (`.ilike()`, `.eq()`, `.contains()` para tags) — nunca concatenação
de string formando SQL dinâmico. Cada filtro (livro, capítulo, versículo,
palavra, tag) é opcional e combinável; a função de service monta a query
programaticamente com o query builder, não com string interpolation.

## 19. Testes obrigatórios da Fase 3

Conforme `SPEC-ORIGINAL.md` e o gate da Fase 3 (`roadmap.md`):

- Streak de devocional e de plano de leitura (reaproveitando os testes já
  existentes de `shared/lib/streak.ts`).
- XP espiritual nunca duplicado (devocional por dia, plano de leitura por
  dia do plano) — unitário (RPC simulada) e teste de integração contra o
  banco real.
- Checklist do devocional: XP só é concedido com os três itens marcados.
- Conclusão de dia do plano de leitura nunca duplica (mesmo dia enviado
  duas vezes).
- Transição de pedido → respondida preserva `requested_at` e preenche
  `answered_at`.
- Teste de integração: usuário A não acessa/gera XP em dados espirituais do
  usuário B (RLS).

## 20. Dinheiro — nunca float

Todo valor monetário persistido é `numeric` no Postgres. No TypeScript, todo
valor monetário trafega como **inteiro de centavos**, nunca `number`
fracionário — soma repetida de centavos nunca sofre o erro clássico de
ponto flutuante (`0.1 + 0.2 !== 0.3`). Parsing/formatação são centralizados
em `shared/lib/money.ts` (`parseMoneyToCents`, `centsToDecimalString`,
`formatCurrencyBRL`), nunca espalhados pelo código. Nenhuma função de
dinheiro retorna `NaN`/`Infinity` — entrada inválida vira `0`/`R$ 0,00`.

## 21. Contas e saldo — sempre calculado, nunca armazenado

`finance_accounts.initial_balance` é o único valor mutável relacionado a
saldo. O saldo exibido é sempre `initial_balance` + soma de
`finance_transactions` não canceladas que afetam aquela conta
(`get_finance_accounts_with_balance`), mesma filosofia de streak/volume de
treino calculados nas fases anteriores — nunca uma coluna de saldo
denormalizada, o que eliminaria por construção qualquer risco de
dessincronização ao editar/cancelar uma transação.

## 22. Transações — tipo define o efeito, valor sempre positivo

- `amount` é sempre `> 0` (constraint). O efeito no saldo depende
  exclusivamente do `type`, nunca do sinal do valor armazenado.
- Transferência (`type = 'transfer'`) é **uma única linha**: `account_id`
  (origem) + `transfer_account_id` (destino). Isso é o que garante, por
  construção, que uma transferência nunca duplica receita/despesa — não
  existem duas linhas (uma de saída, outra de entrada) para reconciliar.
- "Cancelar" uma transação é sempre soft-delete (`canceled_at`), nunca
  `DELETE` físico nem edição que perderia o histórico. Como o saldo é
  sempre calculado excluindo `canceled_at is not null`, cancelar ou editar
  uma transação nunca deixa o saldo inconsistente — não há nada para
  reconciliar manualmente.
- Trigger `finance_transactions_validate_ownership` impede que
  `account_id`/`transfer_account_id`/`category_id` apontem para uma
  conta/categoria de outro usuário (defesa em profundidade além da RLS), e
  também impede contexto inconsistente (ver seção 23).
- **Double-submit** (clique duplo, retry de rede): criar transação sempre
  passa pela RPC `create_finance_transaction`, nunca por um insert direto do
  client. O client gera um `client_request_id` (UUID) uma única vez por
  "intenção de envio" (não a cada clique) e reenvia essa mesma chave em toda
  tentativa daquele envio; `UNIQUE(user_id, client_request_id)` no banco
  garante que reenviar a mesma chave nunca cria uma segunda transação — a
  RPC faz `INSERT ... ON CONFLICT DO NOTHING` e, se o conflito ocorrer, lê e
  retorna a linha já existente, então o resultado é idêntico para o client
  esteja isso na primeira tentativa ou num reenvio (auditoria Fase 4 > 1).
  Aplica-se a toda transação, inclusive e principalmente transferências.

## 23. Pessoal x Empresarial — nunca misturados por padrão

- Toda conta, categoria, transação, recorrência e orçamento tem `context`
  (`pessoal` ou `empresarial`). O dashboard e as listagens filtram por um
  único contexto por padrão; a visão consolidada (soma dos dois) só aparece
  quando o usuário escolhe explicitamente essa opção — nunca é o
  comportamento padrão.
- **Regra de consistência definida na auditoria (Fase 4 > 7)**: o `context`
  de uma transação precisa ser IGUAL ao `context` de toda conta/categoria
  que ela referencia — nunca uma transação `pessoal` usando conta ou
  categoria `empresarial` (e vice-versa), inclusive a conta de destino de
  uma transferência. A mesma regra vale para `finance_recurrences`
  (`account_id`/`category_id`) e `finance_budgets` (`category_id`).
  Garantido pelos triggers `finance_transactions_validate_ownership`,
  `finance_recurrences_validate_ownership` e
  `finance_budgets_validate_ownership` — nunca só pela UI.

## 24. Recorrências — geração idempotente

- `generate_finance_recurrence_occurrences(p_recurrence_id, p_until)` gera
  as ocorrências (linhas em `finance_transactions`) da recorrência até a
  data pedida, respeitando `day_of_month` (meses mais curtos usam o último
  dia do mês), `ends_on` e `total_installments`.
- Idempotência real: `UNIQUE(recurrence_id, transaction_date)` parcial em
  `finance_transactions` — chamar a função de novo para o mesmo período
  nunca duplica uma ocorrência já gerada, e ocorrências antigas nunca são
  sobrescritas (mesmo padrão de `task_recurrences` na Fase 1).
- "Gerar previsões futuras" é uma ação explícita (criar a recorrência já
  gera uma janela inicial; um botão "Gerar próximas" estende a janela) —
  nunca um job invisível rodando sem o usuário saber.

## 25. Orçamentos — planejado/realizado/restante, nunca dividir por zero

`computeBudgetProgress(plannedCents, realizedCents)` calcula
planejado/realizado/restante/percentual. `planned_amount > 0` é garantido
pelo banco (constraint), mas a função ainda se protege: percentual só é
calculado quando `plannedCents > 0`, senão retorna `null` ("sem dados"),
nunca `NaN`/`Infinity` — mesmo padrão de `computeCompletionRate` (Fase 1) e
da taxa de adesão alimentar (Fase 2).

## 26. Alertas de orçamento — thresholds configuráveis, dedup por threshold/período

- `finance_budgets.alert_thresholds` (`smallint[]`, default `{80,90,100}`) é
  configurável por orçamento na criação — 80/90/100 é só o padrão sugerido,
  nunca um valor fixo no código (auditoria Fase 4 > 5). Cada valor precisa
  estar entre 1 e 500.
- Trigger `finance_check_budget_alerts` (AFTER INSERT/UPDATE em
  `finance_transactions`) recalcula o realizado do mês para a categoria da
  transação e, para cada threshold do PRÓPRIO orçamento (`alert_thresholds`)
  cruzado, tenta inserir uma linha em `finance_budget_alerts`.
- `UNIQUE(budget_id, threshold_percent, period_month)` é a garantia real de
  dedup — o mesmo threshold nunca notifica duas vezes no mesmo período,
  mesmo que várias transações cruzem o mesmo patamar depois. Uma única
  transação que ultrapassa vários thresholds de uma vez (ex.: 70% → 130%)
  notifica cada um exatamente uma vez. Um novo `period_month` (mês
  seguinte) sempre permite novos alertas para o mesmo orçamento/categoria.
- A notificação em si (`notifications`, reaproveitada da Fase 1) usa
  `notification_key = 'BUDGET_ALERT:{budget_id}:{threshold}:{period_month}'`,
  segunda camada de dedup independente da primeira.

## 27. Dashboard — filtros por período e contas próximas

- `get_finance_dashboard_summary(p_context, p_period_start, p_period_end)`
  aceita qualquer intervalo de datas — mês atual (padrão da UI), mês
  anterior, ou um intervalo arbitrário — já que `transaction_date` é sempre
  comparado com `between`/`gte`/`lte` sobre `date` puro, nunca timestamp com
  fuso. A UI (`PeriodNavigator`) usa mês atual como padrão
  (`monthOffset = 0`) e permite navegar mês a mês (auditoria Fase 4 > 3).
- `parseLocalDateOnly` (`shared/lib/date/local-date.ts`), não
  `new Date(dateOnlyString)`, é usado para calcular `startOfMonth`/
  `endOfMonth` a partir da data local do usuário — `new Date("2026-03-01")`
  interpreta a string como meia-noite UTC, o que desloca o dia 1 do mês
  para o mês anterior em timezones atrás de UTC (ex.: Brasil) ao extrair
  ano/mês/dia em hora local, corrompendo o período calculado.
- "Contas próximas" reaproveita as transações futuras já geradas por
  `generate_finance_recurrence_occurrences` — nenhum sistema paralelo de
  previsão. É simplesmente `listTransactions` filtrado para
  `transaction_date > hoje`, não cancelada, não-transferência, ordenada por
  data (auditoria Fase 4 > 4).

## 28. Quick Capture — gasto e receita

O botão global de Quick Capture (Fase 1) inclui uma opção "Gasto ou
receita" que reaproveita o MESMO schema Zod (`createTransactionSchema`) e a
mesma RPC (`create_finance_transaction`, com `client_request_id` próprio)
do registro rápido do domínio Financeiro — nunca uma lógica de dinheiro
paralela fora do domínio `finance` (auditoria Fase 4 > 8). Contexto fixo em
`pessoal` (captura rápida global não pede escolha de contexto, para manter
os "poucos campos" — se precisar lançar algo empresarial rapidamente, o
fluxo completo do domínio Financeiro continua disponível).

## 29. Testes obrigatórios da Fase 4

Conforme `SPEC-ORIGINAL.md` e o gate da Fase 4 (`roadmap.md`):

- `shared/lib/money.ts`: parsing/formatação com valores conhecidos, nunca
  `NaN`/`Infinity`, soma repetida sem erro de ponto flutuante.
- `computeBudgetProgress`: valores conhecidos (ex.: R$ 620/R$ 800 = 78%),
  denominador zero/negativo retorna `null`.
- Teste de integração: usuário A não acessa/edita/cancela dados financeiros
  do usuário B, e não consegue referenciar conta/categoria de outro usuário
  numa transação (RLS + trigger de ownership) — cobre as 6 tabelas da fase.
- Teste de integração: geração de recorrência nunca duplica ocorrência
  (chamada repetida, mesmo período) e respeita `total_installments`.
- Teste de integração: alertas de orçamento nunca notificam o mesmo
  threshold duas vezes no mesmo período (default 80/90/100 E thresholds
  customizados), mesmo cruzando vários de uma vez; novo mês permite novos
  alertas.
- Teste de integração: transferência é atômica, idempotente por
  `client_request_id` (double-submit não duplica), nunca conta como
  receita/despesa, e afeta corretamente o saldo das duas contas envolvidas
  com valores exatos (sem tolerância de float).
- Teste de integração: saldo de conta com números conhecidos cobrindo saldo
  inicial + receita + despesa + transferência enviada + transferência
  recebida + transação cancelada, assert exato em centavos.
- Teste de integração: filtros por período (mês atual, mês anterior,
  intervalo customizado, limites de início/fim exatos).
- Teste de integração: precisão monetária com valores clássicos de erro de
  float (0,10 + 0,20), várias transações com centavos, orçamento com
  centavos — assert exato via `parseMoneyToCents`, nunca `toBeCloseTo`.
- Teste de integração: contexto pessoal/empresarial não se mistura (conta e
  categoria de contexto errado são rejeitadas) e a visão consolidada soma
  os dois explicitamente.
- Teste de integração: cancelar uma transação exclui do saldo/dashboard sem
  apagar o histórico (soft cancel).

## 30. Contexto empresarial — genérico, nunca acoplado a um negócio específico

`businesses` é a única entidade nova de "contexto empresarial" — a
arquitetura não é codificada para um tipo específico de negócio (plaquinhas,
sites, serviços digitais...). Todo cliente/catálogo/oferta/venda tem
`business_id` nullable: sem negócio específico é o padrão (permite usar o
produto sem nunca criar um `business`), e um usuário pode ter vários
negócios simultâneos. Financeiro (Fase 4) não é duplicado — Negócios
reaproveita `finance_accounts`/`finance_categories`/`finance_transactions`
(contexto `empresarial`) diretamente.

## 31. Pipeline de clientes/leads — sem CRM excessivamente complexo

- Lead e cliente são a MESMA linha em `customers`, diferenciados só pelo
  `stage`: `possivel_cliente` → `contato_feito` → `interessado` →
  `proposta_enviada` → `negociacao` → `fechado`/`perdido`. Nunca duas
  tabelas com "conversão" de lead para cliente.
- "Próxima ação" (`next_action`/`next_action_date`/`next_action_time`/
  `next_action_notes`) são colunas na própria linha — um cliente ativo tem
  no máximo uma próxima ação pendente por vez. Essa é a fonte única que o
  Dashboard/Hoje vai ler no futuro (Fase 6+); nenhum dado duplicado numa
  tabela de tarefas paralela.
- Histórico de interações (`customer_interactions`) é sempre um INSERT
  novo, nunca edição — `ligacao`, `whatsapp`, `instagram`, `visita`,
  `email`, `proposta`, `nota`. Sem policy de UPDATE/DELETE: histórico
  imutável, mesma filosofia de `weight_logs` (Fase 2).

## 32. Catálogo e ofertas — preço padrão nunca é a fonte da venda

- `catalog_items.default_price`/`default_cost` são só o PADRÃO sugerido.
  `tracks_inventory` só pode ser `true` quando `type = 'produto'` (check no
  banco) — serviço nunca controla estoque.
- `offers`/`offer_items` são um TEMPLATE. Vender uma oferta gera sempre um
  snapshot independente em `sale_items` — o template nunca é escrito no
  momento da venda, o que é o mecanismo real que permite "customizar uma
  oferta para um cliente sem alterar o template global" (CLAUDE.md > Fase 5
  > 5): a customização acontece editando os itens da VENDA
  (`unit_price`/`discount_amount` por item), nunca a oferta.
- Cálculo de kit (`computeOfferPricing`, `src/domains/offers/utils/`): soma
  individual dos itens, desconto (percentual sobre a soma ou valor fixo em
  centavos, nunca sobre o custo), preço final, custo estimado, lucro
  estimado, margem estimada. Desconto nunca deixa o preço final negativo
  (`Math.min(desconto, soma individual)`). Margem retorna `null` quando o
  preço final é `<= 0`, nunca `NaN`/`Infinity`.

## 33. Vendas — status define o que conta, nunca o inverso

- Status: `draft` → `negotiating` → `confirmed` → `paid` → `delivered`, ou
  `cancelled`/`refunded` a partir de qualquer estado não-terminal.
  `REVENUE_STATUSES = ('confirmed', 'paid', 'delivered')` é a ÚNICA lista
  usada em todo cálculo de faturamento/receita/custo/margem/ROI/ticket
  médio/produto mais vendido — `draft`/`negotiating` nunca contam (ainda não
  são vendas reais), `cancelled`/`refunded` NUNCA contam, mesmo que a venda
  já tenha sido paga antes de ser reembolsada.
- `gross_amount`/`discount_amount`/`net_amount`/`direct_costs` são SEMPRE
  calculados pela RPC `create_sale` a partir dos itens recebidos — nunca
  aceitos prontos do client. `net_amount = gross_amount - discount_amount`.
- Excluir uma venda (`DELETE`) só é permitido em `draft`/`negotiating`
  (trigger `sales_prevent_delete_committed`) — uma venda confirmada/paga/
  entregue/cancelada/reembolsada só muda de estado via `update_sale_status`,
  nunca é apagada (preserva o histórico financeiro/de estoque).

## 34. sale_items — snapshot, nunca referência viva ao catálogo

- Cada item de uma venda grava nome, tipo, quantidade, preço unitário,
  desconto, custo unitário e total NO MOMENTO da venda — nunca uma
  referência que é relida do catálogo depois. Mudar
  `catalog_items.default_price` no futuro NUNCA altera uma venda antiga
  (testado explicitamente: ver seção 38).
- `catalog_item_id` usa `on delete restrict` — não é possível apagar um item
  de catálogo referenciado por uma venda histórica (só desativar via
  `is_active = false`), preservando a integridade do snapshot mesmo que o
  catálogo mude.
- Sem policy de UPDATE/DELETE em `sale_items`: é sempre um snapshot
  imutável. Corrigir uma venda em `draft`/`negotiating` é excluir a venda
  inteira (cascade apaga os itens) e recriar — nunca editar um item
  isolado.

## 35. Estoque — sempre calculado, nunca armazenado

- Estoque atual é sempre a soma de `inventory_movements.quantity_delta`
  (`get_inventory_levels()`), nunca uma coluna mutável — mesma filosofia de
  saldo de conta financeira (Fase 4) e streak de hábito (Fase 1).
- Só itens com `type = 'produto'` e `tracks_inventory = true` movimentam
  estoque. Serviço NUNCA gera movimentação, e produto com
  `tracks_inventory = false` também nunca gera — ambos os casos são
  ignorados silenciosamente pelo loop de baixa/estorno em
  `apply_sale_status_effects`.
- Baixa de estoque (`type = 'venda'`, delta negativo) acontece na PRIMEIRA
  vez que a venda entra num status de `REVENUE_STATUSES`
  (`confirmed`/`paid`/`delivered`), vinda de fora desse conjunto — nunca se
  repete numa segunda transição dentro do mesmo conjunto (ex.:
  `confirmed` → `paid` não baixa de novo). Guard: `sales.stock_deducted_at`.
- Estoque insuficiente bloqueia a transição com exceção — não existe
  backorder/estoque negativo nesta fase (CLAUDE.md > Fase 5 > 8: "não
  permitir estoque negativo sem regra explícita"; nenhuma regra explícita de
  override foi criada, então o comportamento padrão é bloquear).
- Estorno (`type = 'estorno'`, delta positivo) acontece quando a venda vai
  para `cancelled`/`refunded` E já tinha baixado estoque antes E ainda não
  tinha sido revertida. Guard: `sales.stock_reverted_at`. Reverte
  exatamente a mesma quantidade que foi baixada, nunca recalculada.
- Movimentações manuais (`entrada`/`saida`/`ajuste`) só existem fora do
  fluxo de vendas (`reference_sale_id` sempre nulo — check no banco impede
  o contrário) e suportam a mesma proteção de idempotência via
  `client_request_id` das operações críticas.

## 36. Atomicidade e idempotência de vendas

- `create_sale` insere `sales` + todos os `sale_items` numa única transação
  (uma função PL/pgSQL = uma transação) — nunca várias mutations soltas do
  client que podem ficar pela metade.
- Idempotência de criação: `client_request_id` gerado uma vez no client por
  "intenção de envio" (não a cada clique) + `UNIQUE(user_id,
  client_request_id)` + `INSERT ... ON CONFLICT DO NOTHING` com fallback de
  leitura da linha já existente — mesmo padrão da Fase 4
  (`create_finance_transaction`).
- Se a venda já nasce num status comprometido (`p_status = 'confirmed'` etc.
  em `create_sale`), os MESMOS efeitos de `update_sale_status` (baixa de
  estoque com validação, lançamento de receita) são aplicados dentro da
  mesma transação, via a função interna compartilhada
  `apply_sale_status_effects` — nunca uma venda criada direto como
  "confirmada" escapa da baixa de estoque só porque não passou por uma
  chamada de transição separada.
- Idempotência/concorrência real de `update_sale_status`: `SELECT ... FOR
  UPDATE` na venda serializa chamadas concorrentes sobre a MESMA linha — as
  duas transações concorrentes nunca leem o mesmo estado "antigo"
  simultaneamente, então os guards (`stock_deducted_at`,
  `stock_reverted_at`, `revenue_transaction_id`) funcionam mesmo sob
  concorrência real (duas chamadas com `client_request_id` DIFERENTES,
  não só reenvio idêntico). `client_request_id` por chamada (tabela
  `sale_status_changes`) cobre o caso adicional de retry idêntico.
- Reflexo financeiro (lançamento de receita em `finance_transactions`) só
  acontece na PRIMEIRA vez que a venda entra em `paid`, e só se a venda tem
  `account_id` definido (reflexo automático é opt-in por venda). Guard:
  `sales.revenue_transaction_id`.
- **XP**: nenhuma regra de XP foi documentada para vendas nesta fase — Fase
  5 não concede XP por criar cliente, catálogo, oferta ou venda. Decisão
  deliberada, mesma filosofia da seção 14 (XP espiritual): resultado de
  negócio (dinheiro, vendas) não deve virar pontuação de jogo. Se essa regra
  mudar no futuro, precisa ser documentada aqui primeiro (CLAUDE.md > Fase 5
  > 9: "XP, se existir regra documentada").
- **Reversão financeira de venda reembolsada**: decisão de escopo —
  reembolsar/cancelar uma venda paga reverte o estoque, mas NÃO cria
  automaticamente uma transação financeira de estorno/reversão. O
  lançamento de receita original permanece (histórico imutável de
  `finance_transactions`, mesma filosofia da Fase 4); se o usuário precisar
  refletir o reembolso no Financeiro, cancela a transação manualmente pela
  tela de Financeiro (`cancelTransaction`, já existente). Documentado aqui
  como limitação conhecida, não como bug.

## 37. Definições dos indicadores — Dashboard empresarial

Central, única fonte de verdade (RPC `get_business_dashboard_summary`) —
nunca calculado de formas diferentes em dois lugares. `REVENUE_STATUSES =
('confirmed', 'paid', 'delivered')` (ver seção 33) é a base de tudo abaixo.
Nenhum indicador aqui é apuração contábil/fiscal oficial.

- **Faturamento bruto**: soma de `gross_amount` de vendas em
  `REVENUE_STATUSES` no período.
- **Receita líquida**: soma de `net_amount` (já é bruto − desconto) das
  mesmas vendas — "menos devoluções/reembolsos" é garantido porque uma
  venda `refunded` nunca está em `REVENUE_STATUSES`, então nunca é somada
  em nenhum indicador de receita, independente de quando o reembolso
  aconteceu.
- **Custo direto (COGS)**: soma de `direct_costs` das mesmas vendas
  (calculado a partir de `sale_items.unit_cost × quantity` no momento da
  criação da venda).
- **Lucro bruto**: receita líquida − custo direto.
- **Despesas operacionais atribuídas**: soma de `finance_transactions` tipo
  `expense`, contexto `empresarial`, não canceladas, no período —
  reaproveita o Financeiro (Fase 4) diretamente, nunca uma segunda tabela
  de despesas.
- **Taxas**: soma de `sales.fees` das vendas em `REVENUE_STATUSES` no
  período (tratadas separadamente de despesas operacionais, como a spec
  pede explicitamente).
- **Lucro líquido gerencial**: lucro bruto − despesas operacionais − taxas.
  Nunca chamado de "lucro contábil/fiscal oficial" na UI.
- **Margem**: lucro bruto / receita líquida × 100. `null` (nunca
  `NaN`/`Infinity`) quando receita líquida `<= 0`.
- **ROI**: lucro bruto / custo direto × 100 — proxy de retorno sobre o
  investimento em custo direto (COGS), já que esta fase não tem uma entidade
  de "investimento" dedicada (ex.: gasto de marketing rastreado por
  campanha). `null` quando custo direto `<= 0` ("investimento não
  identificável" — CLAUDE.md > Fase 5 > 11 pede exatamente esse
  comportamento). Documentado como limitação conhecida — ver seção 39.
- **Ticket médio**: receita líquida / quantidade de vendas em
  `REVENUE_STATUSES` no período. `null` quando não há vendas.
- **Produto mais vendido**: item de catálogo com maior soma de `quantity`
  em `sale_items` das vendas do período (`REVENUE_STATUSES`).
- **Produto mais lucrativo**: item de catálogo com maior soma de
  `(unit_price × quantity − discount_amount − unit_cost × quantity)` no
  período.
- **Leads**: contagem de `customers` criados no período (cohort de
  criação — ver limitação na seção 39).
- **Conversão**: contagem de `customers` com `stage = 'fechado'` **criados**
  no período / leads do período × 100. `null` quando não há leads no
  período. Simplificação documentada: usa o cohort de criação, não a data
  exata em que o estágio mudou para `fechado` (não existe hoje um campo de
  "data de fechamento" — ver seção 39).
- **Follow-ups pendentes**: contagem de `customers` com `next_action_date`
  preenchido (qualquer data, vencida ou futura) — representa "ainda precisa
  de follow-up", não um filtro de "vencido hoje".

Funções puras espelhando as mesmas fórmulas (para teste unitário sem
depender do banco): `src/domains/business/utils/business-indicators.ts`.

## 38. Testes obrigatórios da Fase 5

Conforme `SPEC-ORIGINAL.md` e o gate da Fase 5 (`roadmap.md`):

- `computeOfferPricing`: valores conhecidos (soma individual, desconto
  percentual/fixo, preço final nunca negativo, margem `null` quando preço
  final `<= 0`).
- `business-indicators.ts` (lucro bruto/líquido, margem, ROI, ticket médio,
  conversão): valores conhecidos, incluindo o caso obrigatório do CLAUDE.md
  (bruto 1000, desconto 100, líquida 900, custo direto 200, taxas 50) e
  denominador zero sempre retornando `null`, nunca `NaN`/`Infinity`.
- Teste de integração com números exatos contra o banco real (RPC
  `create_sale`/`get_business_dashboard_summary`) reproduzindo o mesmo caso
  obrigatório, mais: várias vendas, venda cancelada, venda reembolsada
  (mesmo já paga), denominador zero, centavos, kit com múltiplos itens,
  alteração posterior de preço no catálogo não afetando o snapshot
  histórico — nunca `toBeCloseTo` para dinheiro.
- Teste de integração de estoque: estoque inicial, venda reduz estoque,
  double-submit (chamadas concorrentes) reduz uma única vez, cancelamento
  reverte uma única vez mesmo chamado duas vezes, serviço nunca altera
  estoque, item sem controle de estoque nunca altera estoque, movimentação
  manual com `client_request_id` nunca duplica.
- Teste de integração de idempotência/concorrência: `create_sale` com
  chamadas concorrentes e a mesma `client_request_id` cria uma única venda;
  `update_sale_status` com chamadas concorrentes (client_request_id
  diferentes) sobre a mesma venda aplica o efeito uma única vez; reenviar a
  mesma `client_request_id` em `update_sale_status` não reaplica o efeito;
  chamar `paid` duas vezes sem `client_request_id` ainda assim não duplica a
  receita (guard real é `revenue_transaction_id`, não só o dedup).
- Teste de integração: usuário A não acessa/edita/cancela dados de Negócios
  do usuário B, e não consegue referenciar cliente/catálogo/oferta/conta de
  outro usuário numa venda ou oferta (RLS + triggers de ownership) — cobre
  as 10 tabelas da fase.

## 39. Limitações conhecidas da Fase 5 (documentadas, não bugs)

- **ROI** usa custo direto (COGS) como proxy de "investimento" — não existe
  rastreamento de investimento dedicado (ex.: gasto de marketing por
  campanha). Se o produto precisar de ROI de marketing/campanha
  especificamente, isso é uma entidade nova a modelar depois, não uma
  correção desta fórmula.
- **Conversão** usa o cohort de criação do lead (leads criados no período
  vs. fechados dentro do mesmo período de criação), não a data exata da
  transição para `fechado` — não existe hoje uma coluna
  `stage_changed_at`/histórico de estágio. Se precisar de funil exato por
  data de transição, seria necessário um histórico de mudança de estágio
  (mesmo padrão de `customer_interactions`, mas para `stage`).
- **Reembolso não gera reversão financeira automática** — ver seção 36.
- **Sem backorder/estoque negativo com override explícito** — estoque
  insuficiente sempre bloqueia a confirmação da venda nesta fase.

## 40. Metas trimestrais — reaproveita `goals`, nunca duplica conceito

- Meta trimestral é uma linha em `goals` com `type = 'trimestral'` — a
  mesma tabela genérica criada na Fase 1, nunca uma `quarterly_goals` nova.
- `is_completed` marca conclusão (útil para metas de `kind = 'processo'`,
  que não têm um valor numérico para comparar). Metas de `kind = 'resultado'`
  também podem ser marcadas concluídas manualmente — não existe cálculo
  automático de "bateu a meta", porque `target_value`/`current_value` são
  livres (ex.: "melhorar minha saúde" não tem uma métrica única).
- "Metas semanais podem estar ligadas às metas trimestrais": vínculo
  opcional (`weekly_plans.quarterly_goal_id` e `goals.parent_goal_id` para
  o caso genérico de meta-filha-de-meta), aditivo — nunca altera o
  comportamento existente do Planejamento Semanal (Fase 1) quando não
  usado.
- **Limitação conhecida**: o Planejamento Semanal (Fase 1) usa
  `top_priorities` (texto livre), não linhas de `goals` — o vínculo conecta
  a SEMANA (`weekly_plans`) a uma meta trimestral, mas não cria
  automaticamente uma meta semanal formal em `goals`. Se o produto
  precisar de metas semanais completas como linhas de `goals` (não só
  texto livre), isso é trabalho futuro, não desta fase.

## 41. Revisão semanal — snapshot + reflexão, mesmo padrão do encerramento diário

- `weekly_reviews` segue exatamente o padrão de `daily_reviews` (Fase 1):
  a linha grava um SNAPSHOT calculado ao vivo no momento de salvar
  (`get_weekly_review_snapshot`) — nunca uma segunda fonte de verdade
  divergente dos dados reais de cada domínio — mais as respostas de
  reflexão em texto livre ("O que funcionou bem?", "O que não funcionou?",
  "O que posso melhorar?", "Qual minha prioridade na próxima semana?").
- `UNIQUE(user_id, week_start)` — salvar de novo na mesma semana faz
  upsert (o snapshot é recalculado na hora do save, então sempre reflete
  o estado mais atual até aquele momento), nunca cria uma segunda linha.
- Vendas/lucro no snapshot semanal usam a MESMA definição de
  `REVENUE_STATUSES` da Fase 5 (`confirmed`/`paid`/`delivered`) — nunca uma
  segunda definição divergente de "venda válida".

## 42. Recompensas — disponibilidade calculada, resgate nunca subtrai XP

- "Disponível" nunca é uma coluna mutável — é sempre XP total (soma de
  `xp_events`) `>= xp_cost`, calculado na hora em que a tela carrega. Mesma
  filosofia de saldo de conta (Fase 4) e estoque (Fase 5): nada
  denormalizado que possa dessincronizar.
- Resgatar uma recompensa NUNCA subtrai XP retroativamente — não existe
  "saldo de XP gasto". XP é sempre soma imutável de `xp_events`; resgatar é
  só um registro histórico (`reward_redemptions`) de que o usuário escolheu
  usar aquela recompensa, guardando o XP total NO MOMENTO
  (`xp_total_at_redemption`) como referência, nunca recalculado depois.
- `redeem_reward` é uma RPC atômica (soma do XP total + insert do resgate
  numa única transação), nunca duas chamadas soltas do client.

## 43. Conquistas — condições fixas, desbloqueio idempotente

- 8 conquistas fixas no código (`ACHIEVEMENT_DEFINITIONS`), não uma tabela
  configurável pelo usuário: primeira tarefa, 10 tarefas, primeiro hábito,
  7 dias de devocional completo, primeiro treino, primeira venda, meta
  trimestral concluída, 1.000 XP total.
- Condições usam contagens/somas simples em SQL — nunca recomputam o
  algoritmo de streak de `shared/lib/streak.ts` (limitação deliberada:
  "7 dias de devocional" conta 7 dias completos no total, não
  necessariamente consecutivos — proporcional ao escopo desta fase).
- `check_and_unlock_achievements()` é chamada sempre que a página de
  Progresso carrega (dentro do próprio `listAchievements`) — nunca precisa
  de um botão manual "verificar conquistas". Idempotente via
  `UNIQUE(user_id, achievement_key)` + `ON CONFLICT DO NOTHING`: rodar a
  função múltiplas vezes nunca duplica nem "desdesbloqueia" uma conquista.
  Uma conquista desbloqueada é permanente — sem policy de UPDATE/DELETE.

## 44. Dashboard consolidado / Analytics — nunca todos os gráficos juntos

- "Não colocar todos os gráficos simultaneamente. Permitir filtros."
  (CLAUDE.md > Fase 6): a página de Progresso tem (1) um seletor de período
  fixo (7 dias/30 dias/3 meses/6 meses/1 ano) e (2) um seletor de visão
  (Geral/Saúde/Espiritual) no card de resumo — só um recorte por vez.
- `get_progress_summary` calcula contagens brutas (nunca percentuais
  complexos por hábito — isso já existe como utilitário TS dedicado,
  `computeCompletionRate`, fora do escopo de uma RPC de agregação genérica)
  para tarefas, hábitos, treinos, refeições, água, devocional, leitura
  bíblica e peso.
- Financeiro e Negócios NUNCA são recalculados numa segunda função — a
  página de Progresso reaproveita `get_finance_dashboard_summary`
  (contexto `pessoal`) e `get_business_dashboard_summary` (todos os
  negócios) diretamente, os mesmos componentes já usados em
  `/financeiro` e `/negocios`.
- Tendência de XP (`get_xp_trend`) é uma série diária somada por
  `created_at::date` — mesmo princípio de "nunca subestimar/superestimar
  com um único ponto" das tendências já existentes (peso, Fase 2), só que
  aqui o gráfico é a soma diária real, não uma média móvel (XP diário não
  tem o mesmo problema de "ruído de medição" que peso tem).

## 45. Busca global — sempre parametrizada, nunca uma query insegura

- Cada entidade pesquisável (tarefas, clientes, notas de estudo bíblico,
  itens de catálogo) é uma chamada `.ilike()` PARAMETRIZADA e independente
  ao Supabase — o termo digitado nunca é concatenado em SQL, sempre enviado
  como parâmetro do query builder (mesmo princípio da seção 18, Fase 3).
  Todas as chamadas rodam em paralelo (`Promise.all`), nunca uma única
  query gigante, e cada uma continua protegida por RLS.
- **Escopo**: `ideias`/`notas`/`projetos` citados na especificação original
  NÃO existem no produto ainda — as pastas de domínio (`domains/ideas`,
  `domains/notes`, `domains/projects`) são scaffolds vazios desde a Fase 0,
  nenhuma fase do roadmap (`CLAUDE.md > FASES`) implementou essas tabelas.
  Busca global cobre exatamente o que existe: tarefas, clientes/leads,
  notas de estudo bíblico, catálogo (produtos/serviços). Quando
  ideias/notas/projetos forem implementados numa fase futura, adicionar a
  busca correspondente segue o mesmo padrão (uma query `.ilike()`
  parametrizada a mais no `Promise.all`).

## 46. Navegação — Progresso e Menu (mobile)

Resolve a decisão pendente desde a Fase 0 (CLAUDE.md > NAVEGAÇÃO): a bottom
nav mobile agora tem as 5 posições reais — Hoje · Planejamento · (+) ·
Progresso · Menu. "Menu" (`MenuSheet`) agrupa Saúde/Espiritual/Financeiro/
Negócios/Inbox/Configurações num sheet — os mesmos itens já existentes na
sidebar de desktop, só reorganizados para caber nas 5 posições do mobile;
nenhum item perdeu acesso, só mudou de lugar.

## 47. Testes obrigatórios da Fase 6

Conforme `CLAUDE.md` e o gate da Fase 6 (`roadmap.md`):

- Teste de integração: `check_and_unlock_achievements` desbloqueia cada
  condição corretamente e nunca duplica (idempotente, chamado várias
  vezes).
- Teste de integração: `redeem_reward` grava o XP total no momento
  corretamente, nunca subtrai XP.
- Teste de integração: `get_weekly_review_snapshot`/`get_progress_summary`/
  `get_xp_trend` retornam zeros (nunca erro) quando não há dados no
  período.
- Teste de integração: usuário A não acessa/edita dados de Progresso do
  usuário B (RLS), e vínculos (`parent_goal_id`,
  `weekly_plans.quarterly_goal_id`, `reward_redemptions.reward_id`) não
  podem apontar para dados de outro usuário (triggers de ownership) — cobre
  as 5 tabelas novas da fase (`goals` já tinha RLS desde a Fase 1).
- E2E: criar meta trimestral e concluí-la desbloqueia a conquista
  correspondente; revisão semanal calcula e salva; criar/resgatar
  recompensa; busca global encontra e navega até um resultado; bottom nav
  mobile mostra Progresso real e agrupa o resto em Menu.

## 48. Push subscriptions — chaves públicas do dispositivo, nunca secret

- `push_subscriptions` guarda `endpoint`/`p256dh`/`auth` do
  `PushSubscription` que o PRÓPRIO browser do usuário gera — são chaves
  PÚBLICAS do dispositivo, nunca um secret do servidor. A chave PRIVADA
  VAPID nunca é lida por nenhuma tabela nem pelo client: só existe como
  secret da Edge Function de envio.
- `unique(user_id, endpoint)` + upsert torna resubscrever no mesmo
  dispositivo idempotente — nunca duas linhas para o mesmo endpoint.
- Nunca `DELETE` automático em erro transitório de envio — `is_active`
  só vira `false` quando o push service confirma endpoint inválido/expirado
  (HTTP 404/410), nunca por timeout de rede ou erro 5xx.

## 49. Permissão de push — nunca automática

- `Notification.requestPermission()` só é chamado quando o usuário clica em
  "Ativar notificações push" nas Configurações — nunca ao carregar o app
  (CLAUDE.md > Fase 7 > 3).
- Os 3 estados do browser (`granted`/`denied`/`default`) são tratados
  explicitamente. `denied` mostra uma mensagem explicando que a permissão
  foi bloqueada no navegador — nunca tenta pedir de novo (o próprio browser
  não reabre o prompt nesse estado; insistir seria UX ruim e inútil).

## 50. Preferências de notificação — uma linha por usuário

- `notification_preferences` é uma linha por usuário (não uma tabela de
  categorias) — criada automaticamente junto com `profiles` (mesmo trigger
  `on_auth_user_created`, réplica para preferências). "Não precisa de
  configuração exageradamente granular" (CLAUDE.md > Fase 7 > 4): toggles
  de canal (in-app/push) + 8 categorias + 2 resumos + quiet hours, tudo
  booleano/horário simples.
- Presets ESSENCIAL/EQUILIBRADO/INTENSO são só um atalho de UI que ajusta
  várias colunas de uma vez — nunca um valor armazenado à parte (evitaria
  uma segunda fonte de verdade que pode dessincronizar dos toggles reais).

## 51. Horário silencioso — cruza meia-noite, nunca bloqueia sem querer

- `is_within_quiet_hours(hora_local, início, fim)` é uma função pura: se
  `início < fim`, intervalo normal; se `início > fim`, cruza a meia-noite
  (ex.: 22:00 → 07:00); se `início = fim`, DESLIGADO (nunca bloqueia o dia
  inteiro por um erro de configuração igual início=fim).
- `user_is_in_quiet_hours` resolve o fuso do usuário (`profiles.timezone`)
  antes de comparar — mesmo padrão de conversão de timezone da Fase 6.
- Só PUSH respeita quiet hours (SPEC-ORIGINAL.md > HORÁRIO SILENCIOSO:
  "eventos críticos somente se explicitamente configurados" — nenhum evento
  crítico foi configurado nesta fase, então todo push não-crítico espera).
  IN_APP nunca é silenciado — é passivo (só aparece quando o usuário abre o
  app), não interrompe como push.

## 52. Notificações inteligentes — estado atual sempre revalidado

- Cada gerador (`generate_task_reminders`, `generate_water_reminders`,
  `generate_workout_reminders`, `generate_devotional_reminders`) verifica o
  estado ANTES de gerar: tarefa já concluída/cancelada? meta de água já
  batida hoje? treino já concluído? devocional com os 3 checks completos?
  Se sim, não gera (SPEC-ORIGINAL.md > NOTIFICAÇÕES INTELIGENTES).
- Água usa 3 janelas fixas por dia (manhã/tarde/noite) — nunca a cada
  execução do job, para não virar spam. Ao atingir a meta, as janelas
  restantes daquele dia simplesmente não geram mais nada (a condição de
  "meta já batida" já bloqueia).

## 53. Deduplicação — notification_key único em cada camada

- IN_APP (`notifications`, Fase 1) e PUSH (`scheduled_notifications`, nova)
  têm cada uma seu próprio `UNIQUE(user_id, notification_key)` — chaves no
  formato `CATEGORIA:{id}:{data}` (`TASK_REMINDER:{task_id}:{date}`,
  `WATER_REMINDER:{date}:{slot}`, `WORKOUT_REMINDER:{session_id}:{date}`,
  `DEVOTIONAL:{date}`, `DAILY_SUMMARY:{date}`, `WEEKLY_SUMMARY:{week_start}`
  — mesmo padrão de `BUDGET_ALERT:{budget_id}:{threshold}:{period}` já
  usado desde a Fase 4).
- Todo INSERT usa `ON CONFLICT (...) DO NOTHING` — rodar o gerador várias
  vezes (retry de job, cron duplicado) nunca duplica.

## 54. Cancelamento lógico — revalidado de novo no momento do envio

- Gerar e enviar são passos SEPARADOS no tempo (o job de geração roda, o de
  envio roda depois, respeitando quiet hours) — entre os dois, o usuário
  pode ter concluído a atividade. `select_due_push_notifications` revalida
  cada pendência (tarefa/treino/água/devocional) usando a MESMA condição do
  gerador antes de devolver para envio; se não é mais relevante, marca
  `cancelled` (nunca envia desatualizado).
- `status` é uma máquina de estados terminal: `pending` → `sent` |
  `cancelled` | `failed`. Nunca regride, nunca é apagado (histórico
  preservado).
- `daily_summary`/`weekly_summary` não têm condição de cancelamento — um
  resumo já devido continua relevante (não fica "desatualizado" da mesma
  forma que um lembrete de ação pendente).

## 55. Resumo diário e semanal — reaproveitam RPCs existentes

- Resumo diário reaproveita `get_progress_summary(hoje, hoje, user_id)` —
  extensão da Fase 6, sem recalcular tarefas/hábitos/treino/água/devocional
  de novo — e só soma o que falta (gastos pessoais do dia, vendas do dia).
- Resumo semanal reaproveita `get_weekly_review_snapshot(week_start,
  user_id)` inteiro — a mesma função da Fase 6.
- As duas funções da Fase 6 ganharam um parâmetro `p_user_id uuid default
  auth.uid()` para poderem ser chamadas pelo job (sem sessão de usuário,
  `auth.uid()` seria null) sem duplicar as ~15 subqueries de cada uma.
  Chamadas existentes do app (sem esse argumento) continuam idênticas.
- Só entra na mensagem o que tem dado real (`array_length(v_parts,1) is
  null` pula o envio) — nunca um resumo vazio "para preencher espaço"
  (CLAUDE.md > Fase 7 > 10).
- Resumo semanal só é gerado no ÚLTIMO dia da semana configurada
  (`week_start_date(hoje, profiles.week_start) + 6 = hoje`), a partir das
  20h locais — uma vez por semana, nunca todo dia.

## 56. Jobs — geração/seleção/envio/registro sempre separados

- `generate_scheduled_notifications()` (geração) → `Edge Function
  generate-notifications`. `select_due_push_notifications()` (seleção +
  revalidação + quiet hours) → dentro da `Edge Function send-push`, que
  também faz o envio real (Web Push exige HTTP + assinatura VAPID, não dá
  pra fazer em SQL puro) e registra o resultado
  (`mark_push_notification_sent`/`mark_push_notification_failed`).
- Todas as funções de job são `SECURITY DEFINER`, revogadas de
  `anon`/`authenticated` explicitamente (não só de `public` — ver bug real
  na seção "Riscos conhecidos" abaixo) e concedidas só a `service_role`. A
  service_role key só existe na Edge Function (Deno), nunca no browser.
- Idempotência: `ON CONFLICT DO NOTHING` na geração + `locked_at` na
  seleção (impede duas execuções concorrentes do job pegarem a mesma
  notificação) + `attempt_count` limitado a 5 tentativas no envio (nunca
  loop infinito de retry).
- Dependência externa documentada: agendar a chamada periódica das duas
  Edge Functions (pg_cron+pg_net, Supabase Scheduled Functions, ou cron
  externo autenticado por `CRON_SECRET`) é um passo de configuração de
  deploy que não pode ser executado localmente nesta sessão — toda a
  infraestrutura (migrations, RPCs, Edge Functions, testes das funções de
  job) já está pronta e testada contra o banco real.

## 57. Testes obrigatórios da Fase 7

- RLS: `push_subscriptions`/`notification_preferences`/
  `scheduled_notifications` isolados por usuário; nenhuma coluna de secret
  de servidor exposta; funções de job SECURITY DEFINER inacessíveis a
  `authenticated`.
- `is_within_quiet_hours`: intervalo normal, cruzando meia-noite, desligado
  (início = fim), e a versão que resolve timezone do usuário
  (`user_is_in_quiet_hours`).
- Dedup: gerar 2x não duplica (tarefas, devocional, resumo diário, resumo
  semanal).
- Estado atual: tarefa concluída não gera lembrete; devocional já completo
  não gera lembrete.
- Cancelamento lógico: tarefa concluída DEPOIS do agendamento, antes do
  envio, é revalidada e cancelada.
- Quiet hours: notificação de usuário em quiet hours não é selecionada para
  envio, mas continua `pending` (não cancela).
- Retry idempotente: `mark_push_notification_failed` chamado 5x vira
  `failed` terminal, nunca mais reselecionado (sem loop infinito).
- E2E: preferências de notificação salvam e persistem após reload; presets
  de intensidade ajustam várias categorias de uma vez; interface funciona
  em 375/390/430px sem overflow horizontal.

## 58. Auditoria final — segurança de `p_user_id` e Edge Functions

- `get_progress_summary`/`get_weekly_review_snapshot` aceitam `p_user_id`
  para o job de resumo (que roda sem sessão de usuário). Confirmado por
  teste real contra o banco: RLS já bloqueava um usuário `authenticated`
  lendo dado de outro por esse caminho (as subqueries internas continuam
  sujeitas à policy de cada tabela, avaliada com o `auth.uid()` real da
  sessão — não com `p_user_id`). Ainda assim, um guard EXPLÍCITO foi
  adicionado no topo das duas funções (`if p_user_id is distinct from
  auth.uid() and auth.role() <> 'service_role' then raise exception`) como
  defesa em profundidade — nunca depender só de RLS implícita para uma
  garantia crítica, mesmo padrão de "RLS sozinha não é suficiente" já usado
  em triggers de ownership desde a Fase 4.
- As duas Edge Functions (`generate-notifications`, `send-push`) exigem
  `Authorization: Bearer <CRON_SECRET>` quando `CRON_SECRET` está
  configurado — nenhum usuário comum (nem autenticado no app) pode
  acioná-las: elas não fazem parte do schema do PostgREST, só respondem a
  chamadas HTTP diretas autenticadas com esse secret, que só o
  scheduler/operador possui. Nenhuma das duas aceita `user_id` do
  chamador — processam TODOS os usuários elegíveis de uma vez, sem
  parametrização por payload, então não há como um chamador autorizado
  "mirar" um usuário específico mesmo tendo o secret. Erros retornados são
  sempre mensagens de lógica de negócio (nunca a service_role key nem a
  chave privada VAPID).

## 59. Escopo real das categorias — o que é automação de verdade

- **Geradores automáticos implementados** (job real, roda sozinho): Tarefas
  (`TASK_REMINDER`), Água (`WATER_REMINDER`), Treino (`WORKOUT_REMINDER`),
  Espiritual/Devocional (`DEVOTIONAL`), Resumo diário (`DAILY_SUMMARY`),
  Resumo semanal (`WEEKLY_SUMMARY`).
- **Mecanismo parcial pré-existente**: Financeiro tem `BUDGET_ALERT`
  (trigger da Fase 4, IN_APP), mas esse trigger NUNCA consulta
  `notification_preferences.finance_enabled` — desligar o toggle
  "Financeiro" na tela de preferências não desliga os alertas de
  orçamento. A UI mostra essa nota explicitamente ao lado do toggle,
  para não sugerir uma automação (controlável) que não existe.
- **Preferência sem gerador ainda** (só a coluna/toggle existe, nenhum job
  gera notificação por ela hoje): Dieta, Peso, Negócios. A UI marca essas
  3 com "sem lembrete automático ainda" ao lado do checkbox — extensão
  futura, mesmo padrão dos 4 geradores existentes (nova função
  `generate_*_reminders()`, mesma estrutura de dedup/estado/preferência).
- Estoque e XP (citados na spec original) não têm preferência nem gerador
  nesta fase — fora do escopo dos exemplos de dedup que o pedido de
  auditoria trouxe (`TASK_REMINDER`/`WATER_REMINDER`/`WORKOUT_REMINDER`/
  `DEVOTIONAL`/`BUDGET`/`DAILY_SUMMARY`/`WEEKLY_SUMMARY`).

## 60. Subscriptions — auditoria final

- Usuário revoga push a qualquer momento (`useUnsubscribeFromPush`):
  chama `PushSubscription.unsubscribe()` no browser e
  `is_active = false` no banco — client tem RLS própria para isso (é dono
  da linha), não depende de nenhuma função de job.
- `unique(user_id, endpoint)` + upsert: confirmado por teste que resubscrever
  a MESMA subscription (mesmo endpoint) 3x seguidas nunca cria mais de uma
  linha.
- `deactivate_push_subscription` (chamada pela Edge Function só em 404/410
  confirmado do push service) nunca deleta — testado que a linha continua
  existindo com `is_active=false`.
- Erro transitório (rede, 5xx) nunca desativa — só os 2 status codes que
  significam "endpoint não existe mais" disparam a desativação (ver código
  de `supabase/functions/send-push/index.ts`).

## 61. Ativação real — deploy, correções e scheduler de produção

**Deploy real executado e validado ponta a ponta** (não é mais só
infraestrutura local): `generate-notifications` e `send-push` deployadas em
produção (`supabase functions deploy ... --no-verify-jwt`), secrets
configurados (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`,
`CRON_SECRET`), subscription real criada em `/configuracoes`, notificação de
teste enviada e recebida de verdade no navegador, clique confirmado
navegando para a URL de destino.

Dois bugs reais encontrados e corrigidos durante a ativação:

- **`verify_jwt: true` (padrão de deploy) anulava o `CRON_SECRET`**: o
  gateway do Supabase aceitava qualquer JWT válido — inclusive a `anon key`
  pública — antes do código da function rodar, então o check de
  `CRON_SECRET` no código nunca era alcançado por esse caminho. Confirmado
  por teste real: `generate-notifications` respondia 200 usando só a `anon
  key`, sem o secret. Corrigido com redeploy `--no-verify-jwt` nas duas
  functions — agora `CRON_SECRET` é o único portão (`anon key` sozinha e
  ausência de header retornam 401 do PRÓPRIO código, não mais um bypass do
  gateway).
- **Par de chaves VAPID gerado à mão estava malformado** (chave privada
  decodificava para ~18 bytes em vez dos 32 exigidos) — `send-push`
  quebrava com 500 em toda chamada. Corrigido gerando um par novo com
  `webpush.generateVAPIDKeys()` (a própria biblioteca, formato garantido),
  nunca impresso em terminal/log — só escrito em arquivo local temporário,
  lido diretamente para `supabase secrets set`, depois apagado.

### Scheduler de produção — GitHub Actions

`.github/workflows/notifications-cron.yml`, reaproveitando a infraestrutura
de CI já existente (`.github/workflows/ci.yml`) como referência de estilo,
mas como um workflow separado (não faz sentido misturar cron de produção
com o pipeline de lint/test/build de PR).

- **Gatilhos**: `schedule` (cron `*/15 * * * *` — a cada 15 minutos, a
  menor cadência razoável no GitHub Actions; o mínimo técnico é 5 min, mas
  execuções agendadas podem atrasar sob carga) e `workflow_dispatch` (teste
  manual).
- **Ordem**: dois steps sequenciais no mesmo job — `generate-notifications`
  primeiro, `send-push` depois. Se o primeiro step falhar (`exit 1` quando
  o HTTP status não é 2xx), o GitHub Actions já não roda o step seguinte
  por padrão — a ordem "só envia depois de gerar com sucesso" é garantida
  pela semântica normal de steps do Actions, sem lógica extra.
- **Autenticação**: `Authorization: Bearer ${{ secrets.CRON_SECRET }}` —
  nunca a `anon key`, nunca um JWT do Supabase. `CRON_SECRET` vive
  exclusivamente em GitHub Actions Secrets do repositório, nunca no YAML,
  nunca commitado. O valor configurado no GitHub é o MESMO já definido como
  secret da Edge Function no Supabase (`supabase secrets set CRON_SECRET=...`)
  — os dois lados precisam bater.
- **Sem dados sensíveis no log**: o workflow nunca ecoa o header
  `Authorization` explicitamente; o GitHub Actions mascara automaticamente
  qualquer valor de `secrets.*` que apareça em qualquer log. O corpo das
  respostas logado (`cat response.json`) só contém contagens agregadas
  (`generated_count`, `selected/sent/failed`) — nunca dado de usuário nem
  secret.
- **Concorrência**: `concurrency: group: notifications-cron` evita duas
  execuções do workflow sobrepostas — redundante com o lock de banco
  (`locked_at`), mas evita gasto de minutos de CI à toa.
- **Execução manual**: aba "Actions" do repositório no GitHub →
  "Notifications Cron" → botão "Run workflow".
- **Diagnóstico de falha**: aba "Actions" → clicar na execução falha → o
  log de cada step mostra o HTTP status e o corpo da resposta da function
  correspondente; um `::error::` anotado aparece destacado no resumo da
  run. Erros de autenticação aparecem como status 401 no step
  correspondente (secret ausente/errado no GitHub, ou dessincronizado do
  secret da Edge Function no Supabase).

**Validado de verdade**: `workflow_dispatch` manual executado, run
`35814253975`, `conclusion: success`, confirmado de forma independente via
API pública do GitHub (`GET /repos/.../actions/runs/35814253975` e
`.../jobs` — não só relato do usuário), com os dois steps
("Generate notifications", "Send push") verdes em ordem. `CRON_SECRET` foi
rotacionado para um valor novo, configurado igual nos dois lados (Supabase
secret + GitHub Actions secret) — a autenticação funcionou com o valor
novo, provando que a sincronização entre os dois não é um acoplamento
frágil de um valor antigo. O arquivo do workflow está commitado e
empurrado para `master` (único commit desta fase feito até aqui, escopo
exclusivo do workflow — o resto da Fase 7 segue pendente de aprovação) —
como `schedule:` já está no branch default, a execução automática a cada
15 minutos passa a valer a partir da próxima janela do GitHub Actions,
sem nenhuma ação adicional.
