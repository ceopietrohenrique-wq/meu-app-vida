# Regras de Negócio — Fase 1 (Núcleo de Execução), Fase 2 (Saúde), Fase 3 (Espiritual) e Fase 4 (Financeiro)

> Cobre as regras críticas necessárias para tarefas, hábitos, XP (Fase 1),
> peso/IMC/água/alimentação/treino (Fase 2), devocional/estudo bíblico/
> plano de leitura/orações/versículos (Fase 3) e contas/transações/
> categorias/orçamentos/recorrências (Fase 4). Regras de negócios (margem,
> ROI, ticket médio, estoque etc.) serão documentadas quando essa fase
> começar. Toda regra aqui descrita precisa ter teste unitário
> correspondente antes da fase respectiva ser considerada concluída (gate
> da fase, ver `roadmap.md`).

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
