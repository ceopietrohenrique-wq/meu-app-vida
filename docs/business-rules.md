# Regras de Negócio — Fase 1 (Núcleo de Execução)

> Cobre as regras críticas necessárias para tarefas, hábitos e XP na Fase 1.
> Regras de saúde, financeiro e negócios (IMC, margem, ROI, ticket médio,
> estoque etc.) serão documentadas quando essas fases começarem. Toda regra
> aqui descrita precisa ter teste unitário correspondente antes de a Fase 1
> ser considerada concluída (gate da fase, ver `roadmap.md`).

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

## 6. Testes obrigatórios desta fase

Conforme `SPEC-ORIGINAL.md` (seção "Testes unitários obrigatórios") e o gate
da Fase 1:

- Cálculo de XP (diário, semanal, total).
- Prevenção de XP duplicado (marcar/desmarcar/remarcar tarefa e hábito).
- Cálculo de streak atual e melhor streak (diário e dias específicos).
- Taxa de conclusão de hábito, incluindo caso de denominador zero.
- Geração de ocorrências de tarefa recorrente sem duplicar.
- Teste de integração: usuário A não acessa/gera XP em dados do usuário B
  (RLS).
