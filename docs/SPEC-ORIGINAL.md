# SPEC ORIGINAL DO PROJETO

> Este é o documento de especificação completo, na íntegra. Não é para ser
> lido inteiro em toda sessão — sirva-se dele por seção, conforme o módulo
> que estiver sendo implementado no momento. O `CLAUDE.md` na raiz já traz
> o resumo executivo das regras críticas.


---

# MISSÃO

Quero que você atue simultaneamente como:

* Engenheiro de Software Sênior;
* Arquiteto de Software;
* Desenvolvedor Full-Stack;
* Especialista em PostgreSQL/Supabase;
* Product Designer;
* UX/UI Designer;
* Especialista em PWA;
* Especialista em qualidade, testes e segurança;
* Product Manager técnico.

Você será responsável por arquitetar e desenvolver um aplicativo pessoal completo, robusto, modular e preparado para crescer ao longo dos anos.

Não trate este projeto como protótipo, landing page ou demonstração.

Quero um produto real.

O aplicativo será minha CENTRAL PESSOAL para controlar:

* minha rotina;
* tarefas;
* hábitos;
* metas;
* saúde;
* peso;
* alimentação;
* treino;
* água;
* vida espiritual;
* estudo bíblico;
* finanças pessoais;
* finanças dos meus negócios;
* vendas;
* clientes;
* leads;
* produtos;
* serviços;
* kits e ofertas;
* estoque;
* ideias;
* projetos;
* notas;
* produtividade;
* XP;
* recompensas;
* planejamento;
* evolução.

O aplicativo precisa funcionar perfeitamente tanto no CELULAR quanto no COMPUTADOR.

Inicialmente será uma aplicação Web Responsiva + PWA instalável.

O mesmo usuário e banco devem funcionar nos dois dispositivos.

Os dados precisam permanecer sincronizados.

---

# REGRA MAIS IMPORTANTE DO PROJETO

O aplicativo NÃO deverá ser simplesmente um sistema onde eu fico alimentando informações.

Ele deve funcionar como um:

"SISTEMA OPERACIONAL DA MINHA VIDA"

O aplicativo deverá constantemente me ajudar a responder quatro perguntas:

1. O que preciso fazer agora?
2. O que já fiz?
3. Estou avançando?
4. O que preciso melhorar?

A lógica central do produto é:

PLANEJAR
→ LEMBRAR
→ EXECUTAR
→ REGISTRAR
→ GANHAR XP
→ VISUALIZAR PROGRESSO
→ RECEBER FEEDBACK
→ REVISAR
→ MELHORAR

O aplicativo deve me incentivar a AGIR.

---

# PRINCÍPIO CENTRAL DE UX

Apesar de possuir muitas funcionalidades, o aplicativo NÃO poderá parecer complicado.

Não quero 30 opções no menu principal.

A complexidade deve existir nos bastidores.

Na frente, tudo deve ser extremamente simples.

Durante aproximadamente 80% do uso diário, eu deveria precisar somente de:

* Tela Hoje;
* Botão +;
* Notificações;
* Missões;
* Registro rápido.

As áreas detalhadas devem existir para quando eu quiser analisar informações.

---

# TECNOLOGIAS

Use tecnologias modernas, estáveis, amplamente utilizadas e adequadas para produção.

Stack preferencial:

Frontend:
Next.js
React
TypeScript estrito
Tailwind CSS
shadcn/ui
Lucide Icons

Backend:
Supabase

Banco:
PostgreSQL através do Supabase

Autenticação:
Supabase Auth

Storage:
Supabase Storage

Validação:
Zod

Formulários:
React Hook Form

Cache e sincronização de dados do cliente:
TanStack Query quando agregar valor.

Datas:
date-fns ou biblioteca equivalente bem mantida.

Gráficos:
Recharts ou biblioteca React equivalente e estável.

Testes unitários:
Vitest

Testes de componentes:
Testing Library

Testes end-to-end:
Playwright

PWA:
manifest + service worker utilizando solução compatível e estável com Next.js.

Notificações:
Web Push + service worker + backend seguro para gerenciamento dos envios.

Não utilize bibliotecas abandonadas.

Antes de instalar qualquer dependência:

* verificar se realmente é necessária;
* evitar duas bibliotecas fazendo a mesma coisa;
* escolher versões compatíveis;
* fixar versões adequadamente no package.json.

Não atualizar dependências críticas cegamente durante o desenvolvimento.

---

# IDIOMA E LOCALIZAÇÃO

A interface inicialmente deverá estar em:

Português do Brasil.

Formato monetário:

BRL / R$.

Formato de números e datas:

pt-BR.

Timezone:

configurável no perfil do usuário.

Não espalhar formatação manual pelo código.

Criar helpers centralizados para:

* moeda;
* porcentagem;
* data;
* horário;
* números;
* duração;
* peso;
* medidas.

Preparar estrutura para internacionalização futura, mas não transformar isso em uma complexidade desnecessária agora.

---

# ARQUITETURA

Use uma arquitetura baseada em DOMÍNIOS.

Não organize todo o sistema apenas em:

components
hooks
utils

Quero módulos claramente separados.

Exemplos de domínios:

auth
dashboard
planning
tasks
habits
goals
xp
health
workouts
nutrition
spiritual
finance
business
crm
sales
catalog
inventory
ideas
projects
notes
notifications
analytics
reviews
search
settings

Cada domínio deve possuir, conforme necessário:

components
queries
mutations
schemas
types
services
utils

Funções compartilhadas realmente genéricas podem ficar em:

shared
lib
components/ui

Evitar arquivos gigantes.

Evitar componente com centenas ou milhares de linhas.

Evitar lógica de negócio dentro de JSX.

A UI chama serviços/use-cases.

O serviço/use-case executa a regra.

O banco persiste.

---

# ANTES DE ESCREVER CÓDIGO

Antes de começar a implementar telas:

PASSO 1:
Leia toda esta especificação.

PASSO 2:
Crie um documento:

docs/architecture.md

Contendo:

* arquitetura;
* módulos;
* fluxo de dados;
* decisões principais;
* regras críticas.

PASSO 3:
Crie:

docs/database.md

com o modelo de dados e relacionamentos.

PASSO 4:
Crie:

docs/business-rules.md

com fórmulas e regras de negócio.

PASSO 5:
Crie:

docs/roadmap.md

com todas as fases.

PASSO 6:
Defina as migrations iniciais.

PASSO 7:
Somente depois comece a interface.

Não comece criando 50 páginas aleatoriamente.

---

# NAVEGAÇÃO PRINCIPAL

No celular, a navegação inferior deverá possuir apenas:

HOJE

PLANEJAMENTO

*

PROGRESSO

MENU

O botão "+" deverá ficar centralizado e possuir grande importância.

Em MENU estarão:

Saúde
Espiritual
Financeiro
Negócios
Inbox
Configurações

No computador utilizar sidebar:

Hoje

Planejamento

Saúde

Espiritual

Financeiro

Negócios

Progresso

---

Inbox

Configurações

Evite submenus excessivamente profundos.

---

# TELA HOJE

A tela Hoje é o coração do produto.

Precisa carregar rapidamente.

O usuário deverá olhar por aproximadamente 5 segundos e compreender como está seu dia.

Topo:

Saudação.

Data.

Nível.

XP semanal.

Meta semanal.

Exemplo:

Nível 12

620 / 800 XP

78% da meta semanal.

Depois mostrar:

MISSÕES DE HOJE

PRIORIDADES

SAÚDE

ESPIRITUAL

FINANCEIRO

NEGÓCIOS

Nunca mostrar excesso de detalhes.

---

# MISSÕES DE HOJE

Criar conceito de missão.

Missão significa uma atividade que contribui para minha evolução.

Exemplo:

✓ Devocional +10 XP

✓ Registrar gastos +5 XP

○ Treino +30 XP

○ Beber 3L +10 XP

✓ Contatar 5 empresas +30 XP

Mostrar:

XP obtido.

XP disponível.

Progresso.

Missões poderão ser geradas através de:

* hábitos;
* tarefas;
* treino planejado;
* meta de água;
* devocional;
* ações comerciais;
* objetivos configurados.

Não duplicar missão quando a mesma atividade existir em mais de um módulo.

---

# QUICK CAPTURE

O botão "+" é uma das partes mais importantes do produto.

Ao pressionar, mostrar ações frequentes.

Exemplo:

Tarefa

Gasto

Receita

Venda

Ideia

Cliente

Nota

Peso

Água

Refeição

Oração

O sistema deve minimizar cliques.

Um gasto simples deve poder ser registrado em poucos segundos.

Exemplo:

Valor:
R$ 2,00

Descrição:
Bala

Categoria:
Alimentação

SALVAR

Campos opcionais ficam em:

"Mais opções".

Não obrigar o preenchimento de 10 campos para ações simples.

---

# INBOX UNIVERSAL

Criar uma Inbox Universal.

O objetivo é capturar rapidamente qualquer coisa sem precisar decidir imediatamente onde organizar.

Pode receber:

* texto;
* ideia;
* tarefa;
* link;
* anotação;
* algo para pesquisar;
* produto visto;
* vídeo;
* possível cliente;
* lembrete.

Depois o item poderá ser convertido para:

Tarefa
Ideia
Nota
Projeto
Cliente

Possuir status:

Inbox
Processado
Arquivado

---

# PLANEJAMENTO

A área Planejamento terá:

Hoje

Tarefas

Hábitos

Metas

Projetos

Planejamento semanal

Metas trimestrais

---

# TAREFAS

Uma tarefa deverá possuir:

id
user_id
title
description
priority
status
due_date
due_time
estimated_minutes
life_area_id
project_id
goal_id
xp_reward
recurrence
created_at
updated_at
completed_at

Prioridades:

baixa
média
alta
crítica

Status:

pendente
em andamento
concluída
cancelada

Implementar:

Hoje
Próximas
Atrasadas
Concluídas

Permitir recorrência.

Não destruir histórico de tarefas recorrentes.

Uma recorrência deve gerar ocorrências/logs corretamente.

---

# HÁBITOS

Separar hábitos de tarefas.

Exemplos:

Beber água
Ler
Devocional
Dormir no horário
Planejar amanhã

Habit possui:

nome
descrição
frequência
dias
horário
categoria
XP
ativo

Habit logs registram cada execução individual.

Nunca utilizar somente:

habit.completed = true

porque isso quebraria histórico.

Registrar:

habit_id
date
completed_at
value opcional

Criar:

streak atual
melhor streak
taxa de conclusão

Calcular corretamente respeitando frequência.

---

# ROTINAS

Permitir agrupar hábitos em:

Rotina da manhã

Rotina da tarde

Rotina da noite

Exemplo:

Rotina manhã
7 / 9
78%

---

# METAS

Tipos:

Semanal
Mensal
Trimestral
Anual
Personalizada

Tipos conceituais:

Meta de resultado

Meta de processo

Exemplo:

RESULTADO:
Chegar a determinado peso.

PROCESSO:
Treinar 4 vezes por semana.

Uma meta pode se conectar a:

tarefas
hábitos
treinos
projetos
ações comerciais

Calcular progresso automaticamente quando possível.

Evitar permitir percentuais absurdos ou inconsistentes.

---

# PLANEJAMENTO SEMANAL

Criar fluxo específico para começo da semana.

Permitir escolher:

3 principais prioridades.

Quantidade planejada de treinos.

Objetivo alimentar.

Meta comercial.

Meta financeira.

Meta espiritual.

Meta de XP.

Compromissos importantes.

Mostrar semana anterior como contexto.

Não fazer o fluxo durar vários minutos.

Precisa ser rápido.

---

# METAS TRIMESTRAIS

Permitir escolher grandes objetivos de aproximadamente 90 dias.

Exemplos:

Melhorar minha saúde.

Validar meu negócio.

Organizar minhas finanças.

As metas semanais poderão estar ligadas às metas trimestrais.

---

# ENCERRAMENTO DO DIA

Criar uma revisão diária rápida.

Mostrar automaticamente:

Tarefas.

Treino.

Dieta.

Água.

Devocional.

Gastos.

Vendas.

XP.

Exemplo:

Tarefas: 7/9

Dieta: 4/5

Água: 2,5/3L

Treino: concluído

Devocional: concluído

Vendas: R$ 1.280

Gastos: R$ 84

XP: 115

Perguntar opcionalmente:

"Há algo para levar para amanhã?"

Permitir reagendar tarefas rapidamente.

---

# GAMIFICAÇÃO

O XP é extremamente importante.

O objetivo é motivar comportamento e constância.

NÃO transformar o sistema em videogame infantil.

Design adulto e elegante.

Criar:

XP diário
XP semanal
XP total
Nível
Streaks
Conquistas
Missões
Recompensas

---

# REGRA CRÍTICA DO XP

NUNCA conceder XP duplicado.

Se usuário:

marca tarefa
desmarca
marca novamente

não deve conseguir farmar XP.

Criar sistema baseado em eventos.

Tabela conceitual:

xp_events

id
user_id
event_type
entity_type
entity_id
xp_amount
source_key
created_at

Criar constraint UNIQUE adequada para impedir duplicação.

Exemplo source_key:

TASK_COMPLETED:{task_id}

HABIT:{habit_id}:{date}

WORKOUT:{session_id}

DEVOTIONAL:{date}

O backend/database deverá garantir idempotência.

Não confiar somente no frontend.

---

# XP E SAÚDE

NÃO premiar o usuário diretamente por perder peso.

Não usar:

-1 kg = +100 XP.

Premiar COMPORTAMENTOS.

Exemplo:

Treino concluído:
+30 XP

Meta de água:
+10 XP

Alimentação planejada:
+20 XP

Registrar peso semanal:
+5 XP

Caminhada:
+15 XP

O objetivo é incentivar hábitos consistentes.

---

# RECOMPENSAS

Criar sistema de recompensas configuráveis.

Exemplo:

500 XP
Assistir um filme.

1500 XP
Comprar algo pequeno.

3000 XP
Passeio.

Uma recompensa pode:

ficar disponível;

ser resgatada;

guardar histórico.

Não criar punições agressivas ou XP negativo por falhar.

---

# SAÚDE

Saúde é uma das áreas MAIS IMPORTANTES do produto.

O objetivo é ajudar na constância para emagrecimento e melhoria da saúde.

A home da Saúde deverá mostrar:

Peso atual.

Objetivo de peso.

Variação.

Tendência.

Treinos da semana.

Adesão alimentar.

Água.

XP relacionado à saúde.

Atalhos:

Registrar peso

Registrar refeição

+250 ml

+500 ml

Iniciar treino

Calcular IMC

---

# PESO

Criar histórico de peso.

Cada registro:

id
user_id
weight
date
notes
created_at

Nunca sobrescrever registros anteriores.

Mostrar tendência ao longo do tempo.

Não exagerar no significado de variações de um único dia.

Permitir meta de peso.

---

# MEDIDAS CORPORAIS

Opcionalmente registrar:

cintura
quadril
peito
braço
coxa

Cada medição vinculada a uma data.

---

# CALCULADORA DE IMC

Criar calculadora de IMC dentro de Saúde.

Fórmula:

IMC = peso_kg / (altura_m × altura_m)

Entrada:

peso

altura

Pode utilizar altura salva no perfil.

Permitir calcular quando quiser.

Resultado precisa aparecer imediatamente.

Não tratar IMC como diagnóstico médico.

Mostrar mensagem curta explicando que IMC é um indicador geral e não mede diretamente composição corporal.

Se usuário desejar, poderá salvar o cálculo/histórico.

Validar valores impossíveis.

Não permitir divisão por zero.

Nunca retornar:

NaN
Infinity

---

# ÁGUA

Permitir definir meta diária.

Exemplo:

3L.

Botões rápidos:

+250 ml

+500 ml

Também permitir valor personalizado.

Criar water_logs.

Mostrar:

2,5 / 3L

Ao atingir meta, parar lembretes daquele dia.

---

# DIETA / ALIMENTAÇÃO

Não criar inicialmente um sistema tão complexo quanto MyFitnessPal.

Prioridade:

adesão.

Permitir criar refeições planejadas:

Café da manhã

Almoço

Lanche

Jantar

Ceia

Cada refeição:

nome
horário
itens
quantidade
observação

Permitir marcar:

Realizada

Parcialmente

Não realizada

Opcionalmente preparar estrutura para:

calorias
proteína
carboidratos
gordura

Esses campos não devem ser obrigatórios.

Dashboard:

4 / 5 refeições

Adesão da semana:
6 / 7 dias

---

# TREINO

Criar planos de treino.

Exemplo:

Treino A
Peito + Tríceps

Treino B
Costas + Bíceps

Treino C
Pernas

Entidades:

workout_plans
workouts
exercises
workout_exercises
workout_sessions
exercise_sets

Exercício:

nome
grupo muscular
ordem
séries planejadas
repetições
carga
descanso
observação

Durante treino:

mostrar exercício atual.

Adicionar séries rapidamente.

Exemplo:

80 kg × 10

80 kg × 9

75 kg × 11

Guardar:

carga
repetições
data
ordem da série

Mostrar:

última sessão
última carga
melhor desempenho
volume
frequência

Tela de treino precisa ser MUITO boa no celular.

Botões grandes.

Poucos cliques.

---

# ESPIRITUAL

Criar área espiritual organizada em:

Devocional

Estudo Bíblico

Plano de leitura

Orações

Versículos salvos

---

# DEVOCIONAL

Campos:

data
passagem
tema
reflexão
aprendizado
aplicação
oração
tempo
observações

Checklist:

Leitura
Reflexão
Oração

Mostrar sequência de dias.

XP poderá incentivar constância, mas não transformar espiritualidade simplesmente em pontuação.

---

# ESTUDO BÍBLICO

Permitir notas associadas a:

livro
capítulo
versículo inicial
versículo final

Campos:

título
interpretação pessoal
contexto
dúvidas
aplicação
referências cruzadas
tags

Busca posterior por:

livro
capítulo
versículo
palavra
tag

---

# PLANO DE LEITURA

Suportar:

planos personalizados;

estrutura pronta para planos predefinidos futuramente.

Mostrar:

dia atual

dias concluídos

total

porcentagem

streak

---

# ORAÇÕES

Tipos:

Pedido

Agradecimento

Respondida

Permitir alterar pedido para:

Oração respondida.

Guardar:

data do pedido

descrição

data da resposta

observações

---

# FINANCEIRO

Outra área crítica.

Separar conceitualmente:

FINANCEIRO PESSOAL

FINANCEIRO EMPRESARIAL

O usuário poderá alternar contexto.

Não misturar os dois por padrão.

Também permitir visão consolidada caso solicitado.

---

# CONTAS FINANCEIRAS

Criar conceito de conta:

Carteira
Conta bancária
Cartão
Caixa da empresa
Outra

Campos:

nome
tipo
saldo inicial opcional
ativa
contexto pessoal/empresa

Não tentar integrar bancos inicialmente.

---

# TRANSAÇÕES

Qualquer movimento deverá ser registrável.

Exemplo:

R$ 2,00
Bala
Alimentação

Cada transação:

id
user_id
account_id
type
context
amount
description
category_id
transaction_date
payment_method
business_id opcional
sale_id opcional
notes
created_at
updated_at

Tipos:

income
expense
transfer

Valor monetário deve utilizar numeric/decimal apropriado.

NUNCA usar float para dinheiro.

---

# CATEGORIAS

Exemplos pessoais:

Alimentação
Transporte
Academia
Assinaturas
Lazer
Ferramentas
Educação
Compras

Empresarial:

Marketing
Matéria-prima
Estoque
Ferramentas
Hospedagem
Domínio
Taxas
Frete
Impostos
Software

Permitir categorias personalizadas.

---

# DASHBOARD FINANCEIRO

Período padrão:

mês atual.

Mostrar:

Entradas

Saídas

Saldo

Maiores categorias de gasto

Comparativo com mês anterior

Orçamentos

Contas próximas

Exemplo:

Entradas:
R$ 8.400

Saídas:
R$ 3.260

Saldo:
R$ 5.140

Categoria com maior gasto:
Alimentação R$ 920

---

# ORÇAMENTOS

Permitir limite mensal por categoria.

Exemplo:

Alimentação:
R$ 800

Mostrar:

R$ 620 / R$ 800

78%

Criar alertas em níveis configuráveis.

Padrões sugeridos:

80%

90%

100%

Notificação não deve repetir excessivamente.

Registrar que determinado threshold já foi notificado naquele período.

---

# TRANSAÇÕES RECORRENTES

Permitir:

assinaturas

parcelas

contas

pagamentos recorrentes

Exemplo:

Netflix
R$ 39,90
todo dia 15

Permitir gerar previsões futuras.

Não criar duplicação de transação.

---

# NEGÓCIOS

Criar uma central empresarial.

Ela deverá suportar negócios como:

Venda de plaquinhas para avaliações do Google.

Sites.

Serviços digitais.

Configuração e estruturação da presença digital de empresas.

Outros produtos e serviços futuros.

Não codificar o sistema exclusivamente para plaquinhas.

Arquitetura precisa ser genérica.

---

# DASHBOARD DO NEGÓCIO

Mostrar período selecionável.

Principais indicadores:

Faturamento bruto

Receita líquida

Lucro bruto

Lucro líquido

Margem

ROI

Número de vendas

Ticket médio

Produto mais vendido

Produto mais lucrativo

Leads

Conversão

Follow-ups pendentes

---

# DEFINIÇÕES FINANCEIRAS DO NEGÓCIO

Não usar termos financeiros de forma inconsistente.

Definir centralmente.

FATURAMENTO BRUTO:

valor total das vendas antes de descontos/reembolsos, conforme regra definida.

RECEITA LÍQUIDA DE VENDAS:

vendas

* descontos
* devoluções/reembolsos

CUSTO DIRETO / COGS:

custos diretamente atribuíveis à entrega dos produtos/serviços vendidos.

LUCRO BRUTO:

receita líquida

* custos diretos

DESPESAS OPERACIONAIS:

marketing
software
transporte empresarial
ferramentas
etc.

LUCRO LÍQUIDO GERENCIAL:

lucro bruto

* despesas operacionais atribuídas
* taxas
* demais custos definidos

Não chamar esse indicador de contabilidade oficial/fiscal.

É uma visão gerencial do aplicativo.

MARGEM LÍQUIDA:

lucro líquido / receita líquida × 100

TICKET MÉDIO:

receita líquida / quantidade de vendas concluídas

ROI:

Definir ROI somente quando existir investimento identificável.

ROI = (retorno atribuível - investimento) / investimento × 100

Ou equivalente documentado.

Não calcular ROI quando denominador = 0.

Nesse caso mostrar:

"Sem investimento suficiente para calcular ROI."

Nunca retornar Infinity.

---

# PRODUTOS E SERVIÇOS

Criar catálogo genérico.

Item pode ser:

Produto físico

Serviço

Exemplos:

Produto:
Plaquinha de avaliações

Serviço:
Criação de site

Serviço:
Configuração de presença digital

Campos:

nome
tipo
descrição
preço padrão
custo padrão
ativo
SKU opcional
controla estoque?
categoria

---

# KITS / OFERTAS

Criar offers/bundles.

Um kit pode conter:

produtos

serviços

quantidades

descontos

preço especial

Exemplo:

KIT PRESENÇA DIGITAL

1 plaquinha

Configuração da presença da empresa

Site simples

Preço:
R$ 999

Sistema deverá calcular:

preço individual somado

desconto

preço final

custo estimado

lucro estimado

margem estimada

Permitir customizar oferta para cliente específico sem alterar o template global.

---

# VENDAS

Cada venda terá:

cliente

itens

quantidades

valor bruto

desconto

valor final

custos diretos

taxas

forma de pagamento

status

data

responsável

observações

Status possíveis:

draft
negotiating
confirmed
paid
delivered
cancelled
refunded

Não contabilizar vendas canceladas como faturamento.

Definir claramente quais status entram em cada indicador.

---

# ITENS DE VENDA

Nunca guardar venda complexa apenas como:

produto = "Kit A"

valor = 999

Criar sale_items.

Guardar snapshot das informações relevantes no momento da venda:

nome do item
tipo
quantidade
preço unitário
desconto
custo unitário
total

Isso garante que alterar preço futuro do catálogo não altere vendas antigas.

---

# CRM

Criar clientes e leads.

Cliente:

nome
empresa
telefone
WhatsApp
Instagram
email
segmento
cidade
observações

Pipeline:

Possível cliente

Contato feito

Interessado

Proposta enviada

Negociação

Fechado

Perdido

Não criar CRM excessivamente complexo.

---

# PRÓXIMA AÇÃO

Cada lead/cliente ativo pode possuir:

próxima ação

data

horário

observação

Exemplo:

Academia Strong

Próxima ação:
Enviar proposta amanhã.

Esta informação deve alimentar:

Dashboard

Hoje

Notificações

---

# FOLLOW-UPS

Registrar histórico de interações.

Tipos:

Ligação

WhatsApp

Instagram

Visita

Email

Proposta

Nota

Permitir agendar próximo follow-up.

---

# PIPELINE

Mostrar:

Leads

Contatos

Interessados

Propostas

Fechados

Calcular taxa de conversão.

Evitar porcentagem com denominador zero.

---

# ESTOQUE

Criar estoque simples para produtos físicos.

Permitir:

estoque atual

estoque mínimo

movimentações

entrada

saída

ajuste

venda

Ao concluir venda de item com controle de estoque:

reduzir estoque através de transação segura.

Se venda for cancelada e a política permitir:

devolver estoque corretamente.

Não permitir decremento duplicado.

Criar inventory_movements.

O saldo pode ser calculado ou mantido de forma consistente com transação segura.

---

# IDEIAS

Inbox de Ideias.

Campos:

título
descrição
link
origem
categoria
tags
status
data

Status:

Inbox

Analisando

Quero testar

Em execução

Arquivada

---

# ANÁLISE DE IDEIA

Permitir preencher:

problema

público-alvo

solução

monetização

concorrentes

diferencial

investimento

dificuldade

potencial

próximo passo

Não implementar scoring "mágico" sem lógica definida.

---

# TRANSFORMAR IDEIA EM PROJETO

Ação:

Transformar em projeto.

Criar projeto novo mantendo relacionamento com ideia de origem.

Não duplicar dados desnecessariamente.

---

# PROJETOS

Campos:

nome
descrição
status
prioridade
data inicial
prazo
objetivo
progresso
área
ideia de origem

Relacionar tarefas.

Status:

Planejamento

Em andamento

Pausado

Concluído

Cancelado

---

# NOTAS

Sistema simples.

Campos:

título

conteúdo

tags

categoria

favorito

Não tentar replicar Notion.

---

# ÁREAS DA VIDA

Criar life_areas.

Sugestões:

Saúde

Espiritual

Financeiro

Negócios

Conhecimento

Relacionamentos

Pessoal

Trabalho

Permitir personalização.

---

# PROGRESSO

Criar uma página geral chamada:

PROGRESSO

Ela responde:

"Como estou evoluindo?"

Períodos:

7 dias

30 dias

3 meses

6 meses

1 ano

Possíveis indicadores:

XP

Peso

Treinos

Dieta

Hábitos

Tarefas

Devocional

Finanças

Vendas

Não colocar todos os gráficos simultaneamente.

Permitir filtros.

Design limpo.

---

# REVISÃO SEMANAL

Criar relatório automático.

Mostrar:

XP

tarefas

hábitos

treinos

alimentação

água

devocional

leitura bíblica

peso

vendas

lucro

gastos

leads

projetos

Exemplo:

XP
780/700

Treinos
4/4

Dieta
6/7

Devocional
7/7

Tarefas
84%

Vendas
R$ 6.850

Lucro
R$ 3.940

Gastos pessoais
R$ 1.270

Perguntas:

O que funcionou bem?

O que não funcionou?

O que posso melhorar?

Qual minha prioridade na próxima semana?

Salvar respostas.

---

# NOTIFICAÇÕES

Criar um sistema de notificações realmente funcional.

Tipos:

IN_APP

PUSH

Arquitetura deverá estar preparada futuramente para outros canais, mas não implementar canais desnecessários agora.

---

# NOTIFICAÇÕES DE TAREFAS

Exemplos:

"Você ainda tem 3 tarefas importantes hoje."

"Enviar proposta vence em 1 hora."

Não enviar constantemente a mesma mensagem.

---

# NOTIFICAÇÕES DE ÁGUA

Exemplo:

"Você está em 1,5L de 3L hoje."

Quando atingir meta:

PARAR notificações de água naquele dia.

---

# NOTIFICAÇÕES DE DIETA

Exemplos:

"Próxima refeição às 12:30."

"Você ainda não registrou o almoço."

Não enviar se já foi concluída.

---

# NOTIFICAÇÕES DE TREINO

Exemplos:

"Hoje é dia de Costas + Bíceps."

"Seu treino começa em 30 minutos."

"Treino concluído. +30 XP."

---

# NOTIFICAÇÕES DE PESO

Somente quando configurado.

Exemplo:

"Hoje é dia de registrar seu peso."

Não pressionar diariamente por pesagem.

---

# NOTIFICAÇÕES ESPIRITUAIS

Exemplos:

"Seu momento devocional ainda está pendente."

"Leitura de hoje: João 15."

Não transformar em pressão excessiva.

---

# NOTIFICAÇÕES FINANCEIRAS

Exemplos:

"Você utilizou 80% do orçamento de Alimentação."

"A fatura vence em 3 dias."

"Existem R$ 620 em contas previstas esta semana."

---

# NOTIFICAÇÕES DE NEGÓCIO

Exemplos:

"7 possíveis clientes precisam de contato."

"Academia Strong aguarda retorno."

"3 propostas continuam sem resposta."

---

# RESUMO DIÁRIO DE VENDAS

No horário configurado:

Resumo de hoje

4 vendas

R$ 1.860 faturado

R$ 940 lucro gerencial

Ticket médio R$ 465

Não enviar se resumo estiver desabilitado.

---

# NOTIFICAÇÕES DE ESTOQUE

Exemplo:

"Restam apenas 8 plaquinhas."

Disparar ao cruzar estoque mínimo.

Não enviar a mesma notificação toda vez que abrir o app.

---

# NOTIFICAÇÕES DE XP

Exemplos:

"+30 XP — treino concluído."

"Faltam 75 XP para a meta semanal."

"Meta semanal concluída."

Não enviar push para cada microação se isso gerar excesso.

Pequenos ganhos podem ser apenas feedback visual in-app.

---

# INTENSIDADE DE NOTIFICAÇÕES

Criar presets:

ESSENCIAL

EQUILIBRADO

INTENSO

Também permitir configuração individual.

---

# HORÁRIO SILENCIOSO

Permitir definir:

início

fim

Não enviar notificações normais nesse período.

Eventos críticos somente se explicitamente configurados.

---

# SISTEMA DE PREFERÊNCIAS

Cada categoria de notificação deve ter:

enabled
channel
time/preferences
quiet-hours respect
threshold/config

O usuário precisa ter controle.

---

# WEB PUSH / PWA

A aplicação deverá ser instalável como PWA.

Manifest correto:

name

short_name

icons

start_url

display

theme_color

background_color

Criar service worker.

Implementar push notifications com feature detection.

No dispositivo sem suporte ou sem permissão:

não quebrar o aplicativo.

Mostrar apenas notificações internas.

Solicitar permissão de push somente depois de uma ação contextual do usuário.

Nunca disparar prompt de permissão imediatamente ao abrir o aplicativo pela primeira vez.

Guardar subscriptions de forma segura.

Associar subscription ao usuário/dispositivo.

Permitir revogar.

Criar cleanup de subscriptions inválidas.

---

# IOS / IPHONE

O aplicativo deverá funcionar bem como PWA adicionada à tela inicial.

Não depender de funcionalidade exclusiva de Android.

Todas as funcionalidades precisam possuir fallback.

Por exemplo:

Push indisponível?
→ Central de notificações interna continua funcionando.

Offline?
→ Interface básica deverá continuar acessível quando possível.

Não prometer recursos que o navegador não suporta.

Fazer capability detection.

---

# COMPUTADOR

No desktop:

sidebar

dashboard maior

tabelas quando apropriado

gráficos maiores

melhor aproveitamento horizontal

Não simplesmente esticar versão mobile.

---

# DESIGN

Quero design:

minimalista

moderno

premium

adulto

limpo

rápido

motivador

Evitar:

excesso de gradientes

cores extremamente fortes

animações exageradas

interface de videogame infantil

cards desnecessários dentro de cards

---

# DESIGN SYSTEM

Criar tokens.

Cores semânticas:

primary

background

surface

muted

success

warning

danger

border

Não associar lógica diretamente a cores hardcoded.

Componentes:

Button

Input

Select

Textarea

Dialog

Sheet

Drawer

Card

Progress

Badge

Tabs

Toast

Dropdown

Command/Search

EmptyState

Skeleton

ConfirmDialog

StatCard

XPProgress

QuickCapture

NotificationItem

---

# CORES

Utilizar cores com significado.

Verde:
sucesso/progresso positivo.

Amarelo:
atenção.

Vermelho:
problema real/limite/atraso.

Cor primária:
navegação e ações.

Não pintar cada área com uma cor completamente diferente.

---

# MODO ESCURO

Implementar desde cedo.

Garantir contraste adequado.

---

# MOBILE FIRST

Testar principalmente em:

375 px

390 px

430 px

Depois:

768 px

1024 px

1440 px+

Sem scroll horizontal acidental.

Botões touch-friendly.

Inputs grandes o suficiente.

---

# REGRA DOS CLIQUES

Ações realizadas frequentemente devem exigir pouquíssimas interações.

Exemplos:

Adicionar água:
1 ou 2 toques.

Registrar gasto:
poucos campos.

Concluir hábito:
1 toque.

Registrar série de treino:
rápido.

Quick capture:
sempre acessível.

---

# BUSCA GLOBAL

Criar Command/Search.

Pesquisar:

tarefas

clientes

ideias

notas

projetos

anotações bíblicas

produtos

serviços

Permitir navegar diretamente para resultado.

Não fazer uma única query gigante insegura no frontend.

---

# MODELO DE BANCO

Desenhar detalhadamente antes da implementação.

Principais entidades esperadas:

profiles

life_areas

tasks

task_recurrences

habits

habit_logs

routines

routine_habits

goals

goal_links

weekly_plans

quarterly_goals

xp_events

weekly_xp_goals

reward_definitions

reward_redemptions

achievements

user_achievements

health_profiles

weight_logs

body_measurements

water_goals

water_logs

meal_plans

meal_plan_items

meal_logs

workout_plans

workouts

exercises

workout_exercises

workout_sessions

exercise_sets

devotionals

bible_notes

reading_plans

reading_plan_items

reading_logs

prayers

saved_verses

financial_accounts

financial_categories

transactions

recurring_transactions

budgets

budget_alert_events

businesses

customers

leads

crm_interactions

follow_ups

catalog_items

offers

offer_items

sales

sale_items

inventory_items

inventory_movements

ideas

projects

project_tasks

notes

inbox_items

daily_reviews

weekly_reviews

notifications

notification_preferences

push_subscriptions

tags

audit_logs

Não criar tabelas apenas porque estão listadas.

Antes valide necessidade, normalização e relacionamentos.

Se puder simplificar sem perder integridade, documente.

---

# IDs

Usar UUID.

Cada registro pertencente ao usuário deve possuir relação de ownership adequada.

---

# TIMESTAMPS

Quando apropriado:

created_at

updated_at

completed_at

archived_at

deleted_at quando soft delete realmente fizer sentido.

Não usar soft delete indiscriminadamente.

---

# SEGURANÇA

Extremamente importante.

Nunca confiar no frontend.

Criar Supabase Row Level Security.

Cada usuário acessa somente dados autorizados.

Não usar service_role no navegador.

Secrets somente server-side.

Criar policies explícitas.

Validar:

SELECT
INSERT
UPDATE
DELETE

Testar RLS.

---

# VALIDAÇÃO

Toda entrada deverá possuir validação.

Frontend:
feedback rápido.

Backend/database:
integridade real.

Usar constraints quando apropriado.

Exemplo:

amount > 0

weight > 0

height > 0

quantidade >= 0

Nunca confiar apenas em Zod para regras críticas.

---

# DINHEIRO

CRÍTICO:

Nunca utilizar ponto flutuante JavaScript como fonte de verdade para cálculos monetários persistidos.

No PostgreSQL utilizar:

numeric/decimal

com precisão adequada.

No código:

centralizar funções monetárias e evitar erros de arredondamento.

---

# TRANSAÇÕES DE BANCO

Operações críticas devem ser atômicas.

Exemplo:

Finalizar venda
+
baixar estoque
+
gerar movimentação financeira
+
XP

Não executar como várias ações independentes que podem ficar pela metade.

Quando apropriado:

usar PostgreSQL function/RPC ou transaction segura no backend.

---

# IDEMPOTÊNCIA

Operações importantes precisam suportar repetição segura.

Exemplo:

usuário toca duas vezes em "concluir venda".

Não pode:

baixar estoque duas vezes;

gerar receita duas vezes;

gerar XP duas vezes.

Criar:

idempotency key

ou constraints/event keys onde necessário.

---

# AUDITORIA

Criar audit log para alterações relevantes.

Principalmente:

transações financeiras

vendas

estoque

configurações importantes

Não precisa registrar cada hover da interface.

Audit log deve conter:

user_id

entity_type

entity_id

action

before opcional

after opcional

timestamp

---

# SINCRONIZAÇÃO ENTRE DISPOSITIVOS

O usuário poderá:

registrar gasto no iPhone

e depois abrir computador.

Dados devem estar atualizados.

Utilizar cache corretamente.

Após mutations:

invalidar/revalidar queries necessárias.

Usar optimistic UI apenas quando seguro.

Se mutation falhar:

rollback visual.

---

# OFFLINE

Não tentar criar sincronização offline extremamente complexa inicialmente.

Implementar primeiro:

App shell disponível.

Página offline amigável.

Cache de assets.

Nunca cachear dados privados de forma insegura.

Posteriormente, operações offline podem ser adicionadas.

Documentar limitações.

---

# ESTADOS DE UI

Todas as páginas importantes deverão ter:

Loading

Empty

Error

Success

Não mostrar tela branca.

Usar skeleton quando apropriado.

Exemplo empty:

"Você ainda não possui vendas."

Botão:

"Registrar primeira venda"

---

# ERROS

Criar estratégia centralizada.

Usuário recebe mensagens compreensíveis.

Exemplo ruim:

PostgrestError PGRST116.

Exemplo bom:

"Não foi possível salvar a venda. Tente novamente."

Logs técnicos ficam separados.

Nunca expor stack trace ao usuário.

---

# TOASTS

Usar para feedback rápido.

Exemplo:

"Gasto registrado."

"Treino concluído. +30 XP."

Não usar toast para informações que precisam permanecer visíveis.

---

# CONFIRMAÇÃO

Ações destrutivas:

excluir transação

cancelar venda

deletar projeto

devem pedir confirmação.

Mas não perguntar confirmação para cada ação pequena.

---

# UNDO

Quando viável:

oferecer desfazer para ações rápidas.

Exemplo:

"Tarefa concluída — Desfazer"

Sem permitir fraude de XP.

---

# PERFORMANCE

Não buscar banco inteiro.

Paginação em:

transações

vendas

clientes

notas

históricos

Carregar dashboard com queries otimizadas.

Criar índices para colunas frequentemente filtradas:

user_id

date

status

category_id

customer_id

project_id

etc.

Não criar índice sem necessidade.

---

# DASHBOARD

Não fazer dezenas de queries sequenciais.

Avaliar agregações.

Utilizar queries paralelas ou views/functions quando apropriado.

Medir antes de otimizar excessivamente.

---

# ACESSIBILIDADE

Inputs com labels.

Botões acessíveis.

ARIA quando necessário.

Navegação via teclado.

Contraste adequado.

Focus states.

Não depender apenas de cor.

---

# BACKUP E EXPORTAÇÃO

Usuário deve conseguir exportar dados.

Inicialmente permitir formatos adequados como:

CSV para transações.

CSV para vendas.

JSON estruturado para backup completo quando apropriado.

Não permitir exportação de dados de outros usuários.

---

# IMPORTAÇÃO

Não precisa implementar importação complexa na primeira versão.

Arquitetura pode preparar possibilidade futura.

---

# TESTES

TESTES SÃO OBRIGATÓRIOS.

Não deixar para "depois".

Criar testes conforme cada módulo é implementado.

---

# TESTES UNITÁRIOS OBRIGATÓRIOS

Cálculo de XP.

Prevenção de XP duplicado.

Streaks.

IMC.

Progresso semanal.

Metas.

Orçamentos.

Percentuais.

Margem.

Ticket médio.

Lucro.

ROI.

Cálculo de kits.

Estoque.

Conversão.

Datas recorrentes.

---

# TESTES DE INTEGRAÇÃO

Testar:

concluir tarefa gera XP uma vez.

concluir treino gera sessão e XP.

registrar venda afeta indicadores.

venda com estoque reduz estoque uma vez.

cancelamento não duplica reversão.

budget threshold dispara somente corretamente.

usuário A não acessa dados do usuário B.

---

# TESTES END-TO-END

Criar fluxos Playwright.

No mínimo:

Cadastro/login.

Criar tarefa.

Concluir tarefa.

Registrar gasto.

Registrar peso.

Registrar água.

Registrar treino.

Criar cliente.

Registrar venda.

Criar produto/serviço.

Criar kit.

Ver dashboard.

Fazer revisão.

Testar viewport mobile e desktop.

---

# TESTE DE RLS

Criar teste específico para provar:

Usuário A não consegue:

ler

editar

excluir

dados do usuário B.

Isto é obrigatório.

---

# CI

Criar workflow de CI.

Rodar:

lint

typecheck

unit tests

integration tests quando viável

build

Não aceitar merge/build com TypeScript quebrado.

---

# TYPESCRIPT

Ativar modo strict.

Não utilizar any sem justificativa explícita.

Não usar:

as any

para simplesmente silenciar erro.

Corrigir tipos corretamente.

---

# LINT

Configurar ESLint.

Evitar warnings acumulados.

---

# FORMAT

Configurar formatter se necessário.

Manter código consistente.

---

# BANCO E MIGRATIONS

Toda alteração de schema deve ocorrer por migration.

Nunca editar produção manualmente.

Migrations:

nomeadas

versionadas

reproduzíveis

reversíveis quando razoável

---

# SEED

Criar seed de desenvolvimento.

Exemplo:

Hábitos:

Beber 3L

Devocional

Planejar amanhã

Treino:

Costas + Bíceps

Meta semanal:

800 XP

Produtos:

Plaquinha de Avaliação

Serviços:

Site institucional

Configuração de presença digital

Kit:

Presença Digital

Cliente demo.

Transações demo.

Não misturar seed com dados reais.

---

# ENV

Criar:

.env.example

Documentar todas as variáveis.

Nunca commitar secrets.

---

# README

README completo.

Explicar:

pré-requisitos

instalação

env

Supabase

migrations

seed

rodar desenvolvimento

testes

build

PWA

push notifications

deploy

troubleshooting

---

# OBSERVABILIDADE

Criar logging estruturado.

Erros relevantes devem ser rastreáveis.

Preparar integração futura com Sentry ou ferramenta equivalente.

Não deixar console.log aleatório em produção.

---

# PRIVACIDADE

O sistema armazenará dados pessoais e financeiros.

Minimizar exposição.

Não logar:

senhas

tokens

dados sensíveis completos desnecessariamente.

---

# AUTENTICAÇÃO

Criar:

Cadastro

Login

Logout

Recuperação de senha

Sessão persistente

Proteção de rotas

Inicialmente email/senha é suficiente.

Arquitetura não deverá impedir social login no futuro.

---

# ONBOARDING

Onboarding simples.

Perguntar:

Nome

Áreas que deseja acompanhar

Meta semanal de XP

Hábitos iniciais

Meta de água

Meta de peso opcional

Deseja configurar treino?

Deseja configurar devocional?

Deseja configurar orçamento?

Possui negócio?

Permitir pular.

Não criar onboarding de 20 minutos.

---

# CONFIGURAÇÕES

Perfil.

Tema.

Timezone.

Moeda.

Início da semana.

XP.

Notificações.

Horário silencioso.

Metas.

Exportação.

Logout.

---

# REGRA SOBRE FEATURES INCOMPLETAS

Não deixar botão sem funcionar.

Se algo ainda não foi implementado:

não mostrar botão ativo.

Não colocar fake functionality.

Não colocar dados hardcoded fingindo serem reais.

Mocks apenas em desenvolvimento claramente identificado.

---

# REGRA SOBRE PLACEHOLDERS

Evitar:

TODO que nunca é resolvido.

"Em breve" em dezenas de lugares.

Se a feature pertence a fase futura:

não exponha na UI até estar funcional.

---

# FASES DE IMPLEMENTAÇÃO

Não construir tudo ao mesmo tempo.

Executar de forma incremental.

---

# FASE 0 — FUNDAÇÃO

Criar:

arquitetura

projeto

design system

Supabase

Auth

RLS

migrations

estrutura de pastas

CI

testes

PWA básica

layout desktop/mobile

perfil

---

# GATE DA FASE 0

Não avançar enquanto:

build não passar.

typecheck não passar.

auth não funcionar.

RLS não estiver testado.

mobile não estiver utilizável.

desktop não estiver utilizável.

---

# FASE 1 — NÚCLEO DE EXECUÇÃO

Implementar:

Hoje

Tarefas

Hábitos

Missões

XP

Meta semanal

Quick Capture

Inbox

Notificações internas básicas

Planejamento semanal

Encerramento do dia

---

# GATE DA FASE 1

Testar ponta a ponta.

Usuário deve conseguir:

entrar.

criar tarefa.

concluir.

ganhar XP.

não ganhar XP duplicado.

criar hábito.

marcar hábito.

usar Quick Capture.

visualizar Hoje.

---

# FASE 2 — SAÚDE

Implementar:

peso

medidas

IMC

água

dieta

treino

dashboard saúde

gráficos básicos

missões de saúde

---

# GATE DA FASE 2

Testar:

IMC.

água.

peso.

sessão de treino.

séries.

XP de treino.

adesão alimentar.

mobile.

---

# FASE 3 — ESPIRITUAL

Implementar:

Devocional

Bíblia

Plano leitura

Orações

Versículos

Busca das notas

---

# FASE 4 — FINANCEIRO

Implementar:

contas

transações

categorias

orçamentos

recorrências

dashboard

alertas

separação pessoal/empresarial

---

# GATE FINANCEIRO

Validar exaustivamente:

dinheiro com decimal.

somas.

filtros por período.

categorias.

orçamento.

thresholds.

não duplicação.

---

# FASE 5 — NEGÓCIOS

Implementar:

clientes

leads

pipeline

follow-up

catálogo

produtos

serviços

kits

vendas

estoque

dashboard

lucro

margem

ROI

ticket médio

---

# GATE NEGÓCIOS

Criar casos de teste com números conhecidos.

Exemplo:

Venda:
R$ 1.000

Desconto:
R$ 100

Receita:
R$ 900

Custo direto:
R$ 200

Taxa:
R$ 50

Validar exatamente todos os indicadores.

Não confiar em verificação visual.

Criar asserts automatizados.

---

# FASE 6 — PROGRESSO

Implementar:

dashboard consolidado

analytics

revisão semanal

metas trimestrais

recompensas

conquistas

busca global

---

# FASE 7 — NOTIFICAÇÕES PUSH

Implementar:

push subscription

service worker

preferências

quiet hours

jobs agendados

deduplicação

cancelamento lógico quando atividade já foi concluída

resumo diário

resumo semanal

---

# FASE 8 — REFINAMENTO PWA

Implementabilidade.

Offline shell.

Ícones.

Splash apropriada quando suportada.

Performance.

Acessibilidade.

Lighthouse.

Experiência iPhone.

Experiência desktop.

---

# PROCESSO OBRIGATÓRIO DENTRO DE CADA FASE

Para cada fase:

1. Atualizar documentação.

2. Criar/alterar migration.

3. Escrever tipos/schemas.

4. Escrever regra de negócio.

5. Criar testes da regra.

6. Criar camada de dados.

7. Criar interface.

8. Criar testes de integração.

9. Criar E2E relevante.

10. Rodar lint.

11. Rodar typecheck.

12. Rodar testes.

13. Fazer build.

14. Corrigir todos os erros.

Somente depois declarar fase concluída.

---

# NÃO AVANÇAR COM ERROS

Se:

build falhar

teste falhar

migration falhar

typecheck falhar

não continue empilhando funcionalidades.

Corrija primeiro.

---

# NÃO ESCONDER ERROS

Não resolver erros com:

// @ts-ignore

as any

catch vazio

teste.skip indiscriminadamente

desabilitar lint

sem explicar motivo técnico.

Resolver a causa.

---

# ALTERAÇÕES NO BANCO

Antes de criar nova coluna/tabela:

verifique se já existe estrutura equivalente.

Evitar duplicação de conceitos.

Exemplo ruim:

sales.total

sales.total_value

sales.total_amount

sales.amount

para a mesma coisa.

Escolher nomenclatura única.

---

# NOMENCLATURA

Banco:

snake_case.

TypeScript:

camelCase.

Componentes:

PascalCase.

Schemas:

nomes claros.

---

# DATAS

Datas são uma fonte frequente de bugs.

Definir:

date-only

datetime

timezone

com clareza.

Eventos diários como habit_log devem usar data local do usuário corretamente.

Não converter uma data como:

2026-09-20

para dia anterior por erro de UTC.

Criar utilitários centralizados e testes.

---

# INÍCIO DA SEMANA

Configurável.

Usar configuração em:

meta semanal

planejamento semanal

relatórios

XP

Não hardcodar.

---

# DUPLICAÇÃO DE REQUISIÇÕES

Botões de submit devem impedir double-submit.

Exemplo:

botão fica loading.

Também haver proteção backend.

---

# CONCORRÊNCIA

Considere cenário:

celular e computador alterando mesma informação.

Para dados críticos:

usar updated_at.

Avaliar optimistic concurrency onde necessário.

Principalmente:

estoque

transações

vendas

---

# FEEDBACK VISUAL

Quando ação acontecer:

interface responde imediatamente.

Exemplo:

Treino concluído.

Mostrar:

+30 XP.

Atualizar barra semanal.

Não exigir refresh manual.

---

# DASHBOARD GERAL

Objetivo:

resumir toda a vida.

Exemplo visual:

HOJE

Nível 12
620 / 800 XP

SAÚDE

Peso:
92,4kg

Treino:
3/4

Dieta:
5/7

Água:
2,5/3L

ESPIRITUAL

Devocional:
Concluído

Leitura:
João 15

FINANCEIRO

Gastos hoje:
R$47

Mês:
R$2.340

NEGÓCIOS

Vendas hoje:
3

Faturamento:
R$1.280

Leads:
7

Não obrigatoriamente usar esses valores.

S�o exemplo de UX.

---

# DASHBOARD ADAPTATIVO

Se usuário não utiliza determinada área:

reduzir importância ou ocultar card.

Dashboard deverá ser configurável futuramente.

Inicialmente pode usar configurações do onboarding.

---

# PRIVACIDADE DO DASHBOARD

Informações financeiras podem ter:

modo ocultar valores.

Exemplo:

R$ •••••

Botão olho.

---

# PERFORMANCE PERCEBIDA

Tela Hoje deve abrir rapidamente.

Evitar esperar todos os módulos antes de renderizar.

Usar carregamento independente dos cards quando apropriado.

---

# NOTIFICAÇÕES INTELIGENTES

Não basta enviar horários fixos.

Antes de enviar, verificar estado atual.

Exemplo:

Notificação:
"Faça seu treino."

Antes:
treino já foi concluído?

Sim:
não enviar.

Água atingida?

Sim:
não enviar.

Tarefa concluída?

Sim:
não enviar.

Venda meta alcançada?

Trocar mensagem para feedback positivo.

---

# DEDUPLICAÇÃO DE NOTIFICAÇÃO

Criar notification_key.

Exemplo:

WATER_REMINDER:2026-09-20:14

BUDGET:FOOD:2026-09:80

Não gerar duplicado.

---

# JOBS PROGRAMADOS

Criar arquitetura segura para:

lembretes

resumos

recorrências

Utilizar backend/scheduler adequado.

Não depender de usuário manter navegador aberto.

---

# PERMISSÕES

Solicitar push somente depois que usuário:

ativar notificações

ou escolher receber lembretes.

Nunca surpreender.

---

# IA

Não implementar IA agora como dependência.

Preparar estrutura futura.

Possíveis usos:

identificar padrões.

analisar produtividade.

analisar vendas.

resumir semana.

organizar ideias.

Mas toda função principal deve funcionar sem IA.

---

# CÓDIGO

Quero código legível.

Prefira:

funções pequenas.

nomes claros.

responsabilidade única.

Não abstraia prematuramente.

Não crie arquitetura acadêmica exageradamente complexa.

---

# COMENTÁRIOS

Comente o PORQUÊ quando não for óbvio.

Não comentar:

// increment count

count++

---

# COMPONENTES

Componentes precisam ser reutilizáveis quando realmente compartilhados.

Não criar um componente genérico monstruoso com 40 props.

---

# ACESSO AO BANCO

Centralizar operações por domínio.

Não espalhar chamadas Supabase aleatórias em componentes.

---

# SERVER VS CLIENT

Utilizar corretamente conceitos do Next.js.

Não marcar tudo como:

"use client"

Use client component somente quando necessário.

Não colocar secret em client component.

---

# SEGURANÇA DE ROUTES

Rotas privadas precisam exigir sessão.

Não confiar somente em esconder menu.

---

# DEPLOY

Preparar para deploy em ambiente compatível com Next.js e Supabase.

Criar documentação separando:

local

staging opcional

production

---

# CHECKLIST ANTES DE PRODUÇÃO

Verificar:

Auth

RLS

Build

TypeScript

Tests

Migrations

Env

PWA

Push

Mobile

Desktop

Performance

Accessibility

Error states

Backup/export

Não marcar versão como pronta se um desses itens críticos estiver quebrado.

---

# TESTE MANUAL FINAL

Executar uma jornada completa:

Criar conta.

Fazer onboarding.

Criar hábito.

Criar tarefa.

Concluir.

Ganhar XP.

Adicionar água.

Registrar peso.

Calcular IMC.

Registrar refeição.

Executar treino.

Registrar devocional.

Adicionar gasto de R$2.

Ver financeiro.

Criar cliente.

Criar produto.

Criar serviço.

Criar kit.

Registrar venda.

Ver estoque.

Ver faturamento.

Ver lucro.

Ver ROI quando aplicável.

Fazer follow-up.

Ver Dashboard.

Receber notificação de teste.

Fazer encerramento diário.

Fazer revisão semanal.

Testar celular.

Testar desktop.

---

# CRITÉRIO FINAL DE QUALIDADE

O produto deverá parecer um único sistema integrado.

Não pode parecer que:

um desenvolvedor criou Saúde;

outro criou Financeiro;

outro criou Negócios;

e simplesmente juntaram tudo.

Mesmas:

cores

tipografia

componentes

navegação

padrões

feedback

formulários

---

# EXPERIÊNCIA DE USO

O aplicativo precisa ser suficientemente simples para eu utilizá-lo diariamente.

Se registrar algo for cansativo:

simplifique.

Se determinada informação não ajudar em decisão:

não destaque.

Se uma função complexa puder ficar atrás de "Mais detalhes":

faça isso.

---

# PRINCÍPIO FINAL DO PRODUTO

O aplicativo deverá transformar:

INTENÇÃO
→ AÇÃO

AÇÃO
→ CONSTÂNCIA

CONSTÂNCIA
→ PROGRESSO

PROGRESSO
→ FEEDBACK

FEEDBACK
→ MELHORIA

---

# REGRA FINAL

Não priorize velocidade em detrimento da confiabilidade.

A ordem de prioridade é:

1. Integridade dos dados.
2. Segurança.
3. Funcionamento correto.
4. Experiência do usuário.
5. Simplicidade.
6. Testabilidade.
7. Manutenção.
8. Performance.
9. Escalabilidade.
10. Novas funcionalidades.

Construa este aplicativo como um produto que eu possa utilizar todos os dias durante anos.

Não como uma demo.

Não como um MVP descartável.

Não como um conjunto de telas.

Quero um sistema integrado, confiável, rápido, agradável e motivador para administrar minha vida, minha saúde, minhas finanças e meus negócios.
