# Roadmap — Fases do Projeto

> As fases são executadas **em ordem, sem pular e sem paralelizar**. Cada
> fase só é considerada concluída quando o gate correspondente passa
> (lint + typecheck + testes + build + fluxo manual funcionando em mobile e
> desktop). Processo interno de cada fase descrito em `CLAUDE.md`
> ("PROCESSO DENTRO DE CADA FASE").

## Fase 0 — Fundação
Projeto Next.js, design system (tokens + componentes base), Supabase (Auth,
RLS, migrations iniciais), estrutura de pastas por domínio, CI, testes
básicos, PWA básica (manifest + service worker mínimo), layout
desktop/mobile, perfil de usuário.

**Gate:** build ok, typecheck ok, auth funcionando, RLS testado, mobile
utilizável, desktop utilizável.

## Fase 1 — Núcleo de execução
Tela Hoje, Tarefas, Hábitos, Missões, XP, Meta semanal, Quick Capture,
Inbox, notificações internas básicas, Planejamento semanal, Encerramento do
dia.

**Gate:** usuário consegue entrar, criar tarefa, concluir, ganhar XP, não
ganhar XP duplicado, criar hábito, marcar hábito, usar Quick Capture,
visualizar Hoje.

*(Documentação detalhada de banco e regras desta fase: `database.md` e
`business-rules.md`.)*

## Fase 2 — Saúde
Peso, medidas corporais, IMC, água, dieta/alimentação, treino, dashboard de
saúde, gráficos básicos, missões de saúde.

**Gate:** IMC, água, peso, sessão de treino, séries, XP de treino, adesão
alimentar e mobile testados.

## Fase 3 — Espiritual
Devocional, estudo bíblico, plano de leitura, orações, versículos salvos,
busca das notas.

## Fase 4 — Financeiro
Contas, transações, categorias, orçamentos, recorrências, dashboard,
alertas, separação pessoal/empresarial.

**Gate:** dinheiro com decimal validado, somas, filtros por período,
categorias, orçamento, thresholds de alerta, não duplicação de transação
recorrente.

## Fase 5 — Negócios
Clientes, leads, pipeline, follow-up, catálogo, produtos, serviços, kits,
vendas, estoque, dashboard, lucro, margem, ROI, ticket médio.

**Gate:** casos de teste com números conhecidos (venda, desconto, receita,
custo direto, taxa) validando todos os indicadores com asserts
automatizados — nunca só verificação visual.

## Fase 6 — Progresso
Dashboard consolidado, analytics, revisão semanal, metas trimestrais,
recompensas, conquistas, busca global.

## Fase 7 — Notificações Push
Push subscription, service worker completo, preferências, horário
silencioso, jobs agendados, deduplicação, cancelamento lógico quando a
atividade já foi concluída, resumo diário, resumo semanal.

## Fase 8 — Refinamento PWA
Instalabilidade completa, offline shell, ícones, splash quando suportada,
performance, acessibilidade, Lighthouse, experiência iPhone, experiência
desktop.

---

## Checklist final antes de produção

Auth, RLS, Build, TypeScript, Tests, Migrations, Env, PWA, Push, Mobile,
Desktop, Performance, Accessibility, Error states, Backup/export — nenhum
item crítico pode estar quebrado para marcar a versão como pronta.
