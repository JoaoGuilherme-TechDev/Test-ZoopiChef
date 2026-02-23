# 📚 Manual Completo do Sistema

## Sumário

1. [Visão Geral](#visão-geral)
2. [Primeiros Passos](#primeiros-passos)
3. [Menu Principal](#menu-principal)
4. [Módulo Financeiro](#módulo-financeiro)
5. [Módulo ERP Estoque](#módulo-erp-estoque)
6. [Módulo Cardápio](#módulo-cardápio)
7. [Módulo TV](#módulo-tv)
8. [Módulo Marketing](#módulo-marketing)
9. [Módulo IA (Inteligência Artificial)](#módulo-ia-inteligência-artificial)
10. [Configurações](#configurações)
11. [Aplicativos Públicos](#aplicativos-públicos)
12. [Recursos Especiais](#recursos-especiais)
13. [Atalhos de Teclado](#atalhos-de-teclado)
14. [FAQ - Perguntas Frequentes](#faq-perguntas-frequentes)

---

## 📋 Visão Geral

Este sistema é uma plataforma completa para gestão de restaurantes, lanchonetes, pizzarias e estabelecimentos de food service. Oferece funcionalidades para:

- **Gestão de Pedidos**: Recebimento, processamento e acompanhamento de pedidos
- **Cardápio Digital**: Criação e gerenciamento de produtos e categorias
- **Delivery**: Gestão de entregas e entregadores
- **Financeiro**: Controle de caixa, contas a pagar/receber
- **Marketing**: Campanhas, promoções e fidelização
- **IA**: Recomendações inteligentes e automação

---

## 🚀 Primeiros Passos

### Login
Acesse `/auth` para fazer login no sistema com seu email e senha.

### Dashboard
Após o login, você será direcionado ao Dashboard principal (`/`) que exibe:
- Resumo de pedidos do dia
- Faturamento atual
- Pedidos pendentes
- Alertas importantes
- Sugestões da IA

### Painel de Desempenho
Acesse `/performance-panel` para visualizar métricas detalhadas:
- Vendas por período
- Produtos mais vendidos
- Ticket médio
- Taxa de conversão
- Gráficos comparativos

---

## 📱 Menu Principal

### 1. Dashboard (`/`)
**Função**: Visão geral do estabelecimento
- Resumo de vendas
- Pedidos recentes
- Alertas do sistema
- Métricas principais

### 2. Painel Desempenho (`/performance-panel`)
**Função**: Análise detalhada de performance
- Gráficos de vendas
- Comparativos por período
- KPIs do negócio
- Análise de tendências

### 3. Pedidos (`/orders`)
**Função**: Gestão completa de pedidos
- Visualizar todos os pedidos
- Filtrar por status (Novo, Em Preparo, Pronto, Entregue)
- Alterar status dos pedidos
- Imprimir pedidos
- Cancelar pedidos

### 4. Pedido Ligação (`/phone-order`)
**Função**: Criar pedidos recebidos por telefone
- Buscar cliente por telefone
- Montar pedido manualmente
- Calcular taxa de entrega
- Definir forma de pagamento

### 5. Mesas (`/tables`)
**Função**: Controle de mesas do salão
- Mapa visual das mesas
- Status de ocupação
- Transferência de mesas
- Fechamento de conta

### 6. Comandas (`/comandas`)
**Função**: Gestão de comandas
- Criar novas comandas
- Adicionar itens
- Fechar comandas
- Transferir itens entre comandas
- Imprimir QR Codes em lote

### 7. Reservas (`/reservations`)
**Função**: Sistema de reservas
- Agenda de reservas
- Confirmação por WhatsApp
- Controle de capacidade
- Histórico de reservas

### 8. Chamados Salão (`/service-calls`)
**Função**: Atender chamados de clientes
- Chamados de garçom
- Pedidos de conta
- Solicitações especiais

### 9. KDS Cozinha (`/kds`)
**Função**: Kitchen Display System
- Visualização de pedidos na cozinha
- Controle de preparo
- Temporizadores
- Alertas de atraso

### 10. WhatsApp (`/whatsapp`)
**Função**: Gestão de pedidos via WhatsApp
- Pedidos recebidos
- Conversas com clientes
- Automações

### 11. Chat Online (`/chat-monitor`)
**Função**: Monitorar chats do site
- Conversas em tempo real
- Histórico de interações
- Atendimento híbrido (IA + Humano)

### 12. Clientes (`/customers`)
**Função**: Cadastro de clientes
- Lista completa de clientes
- Histórico de pedidos
- Dados de contato
- Endereços salvos
- Alertas personalizados

### 13. Avaliações (`/reviews`)
**Função**: Gestão de avaliações
- Ver avaliações recebidas
- Responder avaliações
- Métricas de satisfação

### 14. Entregadores (`/deliverers`)
**Função**: Cadastro de entregadores
- Lista de entregadores
- Status (ativo/inativo)
- Veículo utilizado
- Contato WhatsApp

### 15. Ranking Entregas (`/deliverer-rankings`)
**Função**: Performance dos entregadores
- Entregas realizadas
- Tempo médio de entrega
- Taxa de pontualidade
- Ranking diário/semanal

### 16. Acerto (`/settlement`)
**Função**: Acerto com entregadores
- Entregas pendentes de acerto
- Valores a receber
- Histórico de pagamentos

### 17. Relatórios (`/reports`)
**Função**: Relatórios gerenciais
- Vendas por período
- Produtos vendidos
- Métodos de pagamento
- Exportação de dados (LGPD)

### 18. Dashboard Tempos (`/reports/timers`)
**Função**: Análise de tempos
- Tempo de preparo
- Tempo de entrega
- Alertas de atraso

### 19. Fidelidade (`/loyalty`)
**Função**: Programa de fidelidade
- Pontos acumulados
- Resgates realizados
- Configuração de regras

### 20. Mensagens (`/internal-messages`)
**Função**: Comunicação interna
- Enviar mensagens para setores
- Alertas para cozinha
- Comunicados gerais

---

## 💰 Módulo Financeiro

### 1. Financeiro (`/finance`)
**Função**: Dashboard financeiro
- Receitas e despesas
- Fluxo de caixa
- Gráficos financeiros

### 2. Controle de Caixa (`/cash-register`)
**Função**: Operações de caixa
- Abrir/fechar caixa
- Sangrias e reforços
- Conferência de valores

### 3. Histórico Caixas (`/cash-history`)
**Função**: Histórico de operações
- Caixas anteriores
- Diferenças encontradas
- Relatórios detalhados

### 4. Formas Pagamento (`/payment-methods`)
**Função**: Configurar métodos de pagamento
- Dinheiro, cartões, PIX
- Taxas por método
- Ativar/desativar opções

### 5. Contas Bancárias (`/bank-accounts`)
**Função**: Cadastro de contas
- Bancos e agências
- Saldos
- Conciliação

### 6. Contas a Pagar (`/accounts-payable`)
**Função**: Gestão de despesas
- Cadastrar contas
- Programar pagamentos
- Categorização

### 7. Plano de Contas (`/chart-of-accounts`)
**Função**: Estrutura contábil
- Categorias de receita
- Categorias de despesa
- Organização hierárquica

### 8. Fiado (`/customer-credits`)
**Função**: Controle de fiado
- Clientes com débito
- Registrar pagamentos
- Limite de crédito

### 9. Relatório Fiado (`/reports/fiado`)
**Função**: Relatório de inadimplência
- Total em aberto
- Clientes devedores
- Histórico de pagamentos

### 10. Estoque (`/inventory`)
**Função**: Controle básico de estoque
- Produtos em estoque
- Alertas de baixa
- Movimentações

### 11. ERP Financeiro (`/finance-erp`)
**Função**: Módulo ERP completo
- DRE (Demonstração de Resultados)
- CMV (Custo de Mercadoria Vendida)
- Fluxo de caixa detalhado

---

## 📦 Módulo ERP Estoque

### 1. Itens ERP (`/erp-inventory/items`)
**Função**: Cadastro de insumos
- Matérias-primas
- Embalagens
- Unidades de medida
- Custo unitário

### 2. Compras (`/erp-inventory/purchases`)
**Função**: Registro de compras
- Entrada de nota fiscal
- Fornecedores
- Histórico de preços

### 3. Fichas Técnicas (`/erp-inventory/recipes`)
**Função**: Receitas e composições
- Ingredientes por produto
- Quantidade utilizada
- Cálculo automático de custo

### 4. Estoque ERP (`/erp-inventory/stock`)
**Função**: Posição de estoque
- Saldo atual
- Estoque mínimo
- Alertas de reposição

### 5. Movimentações (`/erp-inventory/movements`)
**Função**: Histórico de movimentos
- Entradas e saídas
- Ajustes de inventário
- Transferências

### 6. Inventário (`/erp-inventory/inventory-count`)
**Função**: Contagem física
- Criar inventário
- Lançar contagem
- Gerar ajustes

### 7. CMV (`/erp-finance/cmv`)
**Função**: Análise de CMV
- Custo por produto
- Margem de contribuição
- Evolução histórica

### 8. Precificação (`/erp-finance/pricing`)
**Função**: Sugestão de preços
- Cálculo baseado em custo
- Margem desejada
- Comparativo com concorrência

### 9. Lucro (`/erp-finance/profit`)
**Função**: Análise de lucratividade
- Lucro por produto
- Produtos mais rentáveis
- Oportunidades de melhoria

---

## 🍕 Módulo Cardápio

### 1. Categorias (`/categories`)
**Função**: Organizar produtos em categorias
- Criar/editar categorias
- Definir ordem de exibição
- Ícones personalizados
- Horários de disponibilidade

### 2. Subcategorias (`/subcategories`)
**Função**: Subdivisões de categorias
- Criar subcategorias
- Vincular a categorias
- Ordenação

### 3. Produtos (`/products`)
**Função**: Cadastro de produtos
- Nome e descrição
- Preço e promoções
- Imagens
- Opcionais e adicionais
- Controle de estoque

### 4. Sabores (`/flavors`)
**Função**: Sabores para pizzas/produtos
- Cadastrar sabores
- Vincular a categorias
- Definir preços por tamanho

### 5. Grupos Opcionais (`/optional-groups`)
**Função**: Adicionais e opcionais
- Criar grupos (ex: Bebidas, Bordas)
- Definir opções
- Preços adicionais
- Limites de seleção

### 6. Cardápio Avançado (`/advanced-menu`)
**Função**: Configurações avançadas
- Informações nutricionais
- Alérgenos
- Harmonizações
- Tags dietéticas

### 7. Destaques Sabor (`/flavor-highlight-groups`)
**Função**: Destacar sabores
- Sabores em promoção
- Novidades
- Mais vendidos

### 8. Ações em Lote (`/batch-actions`)
**Função**: Operações em massa
- Alterar preços
- Ativar/desativar produtos
- Atualizar categorias

---

## 📺 Módulo TV

### 1. Telas de TV (`/tv-screens`)
**Função**: Gerenciar TVs do estabelecimento
- Cadastrar telas
- Definir conteúdo
- Tokens de acesso

### 2. Banners TV (`/banners`)
**Função**: Conteúdo para TVs
- Upload de imagens
- Ordem de exibição
- Agendamento
- Tipo de banner (menu, promoção, institucional)

---

## 📢 Módulo Marketing

### 1. Campanhas (`/campaigns`)
**Função**: Criar campanhas de marketing
- Campanhas por WhatsApp
- Segmentação de clientes
- Agendamento
- Métricas de resultado

### 2. Recompra (`/repurchase`)
**Função**: Recuperar clientes inativos
- Identificar clientes sumidos
- Enviar ofertas personalizadas
- Acompanhar conversões

### 3. Programa Indicação (`/referral-program`)
**Função**: Marketing de indicação
- Clientes indicam amigos
- Recompensas automáticas
- Tracking de indicações

### 4. Gamificação (`/gamification`)
**Função**: Engajamento por jogos
- Conquistas e badges
- Rankings de clientes
- Recompensas por atividade

### 5. Destaque Horário (`/time-highlights`)
**Função**: Promoções por horário
- Happy hour
- Promoções de almoço
- Descontos noturnos

### 6. Marketing (`/marketing`)
**Função**: Central de marketing
- Visão geral de campanhas
- Métricas unificadas
- Sugestões de ações

### 7. Roleta Prêmios (`/prizes`)
**Função**: Prêmios da roleta
- Cadastrar prêmios
- Probabilidade de ganho
- Validade
- Histórico de resgate

### 8. Cupons (`/coupons`)
**Função**: Cupons de desconto
- Criar cupons
- Definir regras (valor mínimo, produtos)
- Limite de uso
- Validade

---

## 🤖 Módulo IA (Inteligência Artificial)

### 1. IA Operacional (`/ai-operational`)
**Função**: Sugestões operacionais
- Otimização de processos
- Redução de desperdício
- Melhoria de tempos

### 2. IA Recomendações (`/ai-recommendations`)
**Função**: Recomendações de negócio
- Ações priorizadas
- Impacto estimado
- Aplicar com um clique

### 3. Central de Sugestões (`/ai-suggestions`)
**Função**: Hub de sugestões IA
- Todas as sugestões
- Histórico de aplicação
- Métricas de resultado

### 4. Marketing AI Posts (`/ai-marketing-posts`)
**Função**: Posts automáticos
- Geração de conteúdo
- Templates de mensagens
- Calendário de campanhas
- Preview de posts

### 5. Previsão de Churn (`/ai-churn`)
**Função**: Prever abandono
- Clientes em risco
- Ações preventivas
- Recuperação automática

### 6. Chatbot WhatsApp (`/chatbot-settings`)
**Função**: Configurar chatbot
- Respostas automáticas
- Fluxos de conversa
- Integração com cardápio

### 7. Cardápio Criativo (`/ai-menu-creative`)
**Função**: Criação de produtos
- Sugestões de nomes
- Descrições atrativas
- Combinações de sabores

### 8. Agenda TV (`/ai-tv-scheduler`)
**Função**: Programação automática de TV
- Rotação inteligente
- Baseado em horário
- Otimização de vendas

### 9. Previsão Demanda (`/demand-forecast`)
**Função**: Prever vendas
- Previsão diária/semanal
- Produtos mais vendidos
- Recomendações de estoque

### 10. QA Testes (`/qa`)
**Função**: Testes de qualidade
- Verificar integrações
- Testar funcionalidades
- Diagnóstico de problemas

---

## ⚙️ Configurações

### 1. Empresa (`/company`)
**Função**: Dados da empresa
- Nome e CNPJ
- Endereço
- Horário de funcionamento
- Logo e cores

### 2. Clientes (`/settings/customers`)
**Função**: Configurações de clientes
- Campos obrigatórios
- Validações
- Alertas automáticos

### 3. Caixa (`/settings/cash`)
**Função**: Configurar caixa
- Abertura/fechamento automático
- Valores iniciais
- Permissões

### 4. Pedidos (`/settings/orders`)
**Função**: Configurar pedidos
- Status personalizados
- Fluxo de aprovação
- Notificações

### 5. Mesas (`/settings/table`)
**Função**: Configurar mesas
- Quantidade de mesas
- Layout do salão
- Taxa de serviço

### 6. Reservas (`/settings/reservations`)
**Função**: Configurar reservas
- Horários disponíveis
- Antecedência mínima
- Confirmação automática

### 7. Tablet Autoatendimento (`/settings/tablet-autoatendimento`)
**Função**: Configurar tablets
- Modo quiosque
- Produtos exibidos
- Pagamento integrado

### 8. Pedido Online (`/settings/pedido-online`)
**Função**: Configurar cardápio online
- Informações de contato
- Redes sociais
- Horário de delivery

### 9. Taxas de Entrega (`/settings/delivery`)
**Função**: Configurar delivery
- Taxas por bairro/distância
- Valor mínimo
- Área de atendimento

### 10. Pizza (`/settings/pizza`)
**Função**: Configurar pizzas
- Tamanhos disponíveis
- Sabores por pizza
- Regras de divisão

### 11. Enólogo Virtual (`/settings/sommelier`)
**Função**: Assistente de vinhos
- Harmonizações
- Sugestões automáticas
- Catálogo de vinhos

### 12. Branding (`/settings/branding`)
**Função**: Identidade visual
- Cores do sistema
- Logo
- Fontes

### 13. Integrações (`/settings/integrations`)
**Função**: Conectar serviços
- WhatsApp (Z-API, Evolution)
- Pagamentos (PIX, cartão)
- Impressoras

### 14. Impressão (`/settings/printing`)
**Função**: Configurar impressoras
- Impressoras por setor
- Layout dos cupons
- Impressão automática

### 15. Roleta (`/settings/wheel`)
**Função**: Configurar roleta de prêmios
- Regras de participação
- Limite de giros
- Prêmios disponíveis

### 16. IA (`/settings/ai`)
**Função**: Configurar inteligência artificial
- Modelos utilizados
- Nível de automação
- Limites de uso

### 17. Layout Cardápio (`/settings/layout`)
**Função**: Aparência do cardápio
- Tema (claro/escuro)
- Organização de produtos
- Destaques visuais

### 18. Pânico (`/settings/panic`)
**Função**: Botão de emergência
- Telefones de emergência
- Mensagem de alerta
- Ativação rápida

### 19. Sons (`/settings/sounds`)
**Função**: Alertas sonoros
- Som de novo pedido
- Alertas de atraso
- Volume e tipo

### 20. Usuários (`/users`)
**Função**: Gerenciar usuários
- Criar/editar usuários
- Definir senhas
- Atribuir perfis

### 21. Perfis de Acesso (`/profiles`)
**Função**: Permissões
- Criar perfis (Admin, Caixa, Garçom)
- Definir permissões por tela
- Restrições de acesso

### 22. Meus Links (`/my-links`)
**Função**: Links públicos
- Link do cardápio
- Link da roleta
- Link de avaliação
- QR Codes

---

## 🌐 Aplicativos Públicos

### Cardápio Online
- **Por Token**: `/m/:token`
- **Por Slug**: `/:slug` ou `/:slug/delivery` ou `/:slug/web`

**Função**: Cardápio para clientes fazerem pedidos

### TV Menu
- **Por Token**: `/tv/:token`
- **Por Slug**: `/:slug/tv`

**Função**: Menu para exibição em TVs

### Roleta de Prêmios
- **Por Token**: `/r/:token`
- **Por Slug**: `/:slug/roleta`

**Função**: Jogo para clientes ganharem prêmios

### KDS Público
- **Por Token**: `/kds/:token`
- **Por Slug**: `/:slug/kds`

**Função**: Tela da cozinha para exibição

### Mesa QR Code
- **Rota**: `/qr/mesa/:token`

**Função**: Cardápio para mesas específicas

### Comanda QR Code
- **Rota**: `/qr/comanda/:token`

**Função**: Cardápio vinculado a comanda

### Avaliação
- **Rota**: `/avaliar/:token`

**Função**: Cliente avaliar o pedido

### Enólogo Virtual
- **Rota**: `/enologo/:token`

**Função**: Assistente de vinhos para clientes

### App Entregador
- **Rota**: `/deliverer/:token` ou `/:slug/entregador`

**Função**: Aplicativo para entregadores

### App Garçom
- **Rota**: `/waiter` ou `/:slug/garcom`

**Função**: Aplicativo para garçons
- Ver mesas e comandas
- Adicionar pedidos
- Solicitar impressão

### Autoatendimento
- **Rota**: `/:slug/autoatendimento`

**Função**: Totem de autoatendimento

### Reservas
- **Rota**: `/reserva/:slug`

**Função**: Cliente fazer reserva

---

## ⌨️ Atalhos de Teclado

| Atalho | Função |
|--------|--------|
| `Ctrl + K` | Busca rápida |
| `Alt + 1` | Dashboard |
| `Alt + 2` | Pedidos |
| `Alt + 3` | KDS |
| `Alt + 4` | Caixa |
| `Alt + 5` | Clientes |

---

## 🔧 Recursos Especiais

### Indicador de Status Online
Mostra se você está conectado à internet (verde = online, vermelho = offline)

### Central de Notificações
Sino no canto superior - mostra alertas importantes do sistema

### Central de Ajuda
Botão de interrogação - FAQ com perguntas frequentes

### Botão de Pânico
Botão vermelho no header - envia alerta de emergência

### Tema Claro/Escuro
Botão para alternar entre modos de visualização

### Arrastar e Soltar Menu
Administradores podem reorganizar itens do menu arrastando

---

## ❓ FAQ - Perguntas Frequentes

### Pedidos

**Como criar um pedido manualmente?**
Vá em Pedidos > clique em "Novo Pedido" ou use "Pedido Ligação"

**Como cancelar um pedido?**
Clique no pedido > Ações > Cancelar > Informe o motivo

**Como imprimir um pedido?**
Clique no pedido > Imprimir ou configure impressão automática

### Caixa

**Como abrir o caixa?**
Vá em Controle de Caixa > Abrir Caixa > Informe o valor inicial

**Como fazer sangria?**
Caixa aberto > Sangria > Informe valor e motivo

**Como fechar o caixa?**
Caixa aberto > Fechar Caixa > Confira os valores

### Impressão

**A impressora não está imprimindo?**
1. Verifique se a impressora está ligada e conectada
2. Confira as configurações em Configurações > Impressão
3. Teste a impressão pelo botão "Testar Impressora"

**Como configurar impressão automática?**
Configurações > Impressão > Ative "Impressão Automática"

### Delivery

**Como cadastrar taxa de entrega?**
Configurações > Taxas de Entrega > Adicionar Região

**Como atribuir entregador?**
Pedido pronto > Despachar > Selecione o entregador

### Marketing

**Como criar uma campanha?**
Marketing > Campanhas > Nova Campanha > Configure público e mensagem

**Como ver clientes inativos?**
Marketing > Recompra > Lista de clientes por dias sem comprar

---

## 📞 Suporte

Para suporte técnico, utilize a Central de Ajuda (botão ❓ no sistema) ou entre em contato com o administrador.

---

*Manual atualizado em Janeiro 2026*
*Versão do Sistema: Zoopi Platform*
