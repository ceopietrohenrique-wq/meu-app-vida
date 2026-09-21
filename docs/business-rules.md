# Regras de Negócio — Fase 1 (Núcleo de Execução), Fase 2 (Saúde) e Fase 3 (Espiritual)

> Cobre as regras críticas necessárias para tarefas, hábitos, XP (Fase 1),
> peso/IMC/água/alimentação/treino (Fase 2) e devocional/estudo bíblico/
> plano de leitura/orações/versículos (Fase 3). Regras de financeiro e
> negócios (margem, ROI, ticket médio, estoque etc.) serão documentadas
> quando essas fases começarem. Toda regra aqui descrita precisa ter teste
> unitário correspondente antes da fase respectiva ser considerada
> concluída (gate da fase, ver `roadmap.md`).

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
