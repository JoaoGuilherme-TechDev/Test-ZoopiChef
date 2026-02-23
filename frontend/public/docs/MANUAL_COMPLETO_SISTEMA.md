# 📚 MANUAL COMPLETO DO SISTEMA
## Guia de Treinamento para Equipe de Testes

**Versão:** 1.0  
**Data:** Janeiro 2026  
**Sistema:** Plataforma de Gestão para Restaurantes e Food Service

---

## 📋 ÍNDICE

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Acesso e Login](#2-acesso-e-login)
3. [Menu Principal - Operações](#3-menu-principal---operações)
4. [Menu Financeiro](#4-menu-financeiro)
5. [Menu ERP e Estoque](#5-menu-erp-e-estoque)
6. [Menu Cardápio](#6-menu-cardápio)
7. [Menu Gestão de Pessoas](#7-menu-gestão-de-pessoas)
8. [Menu Logística](#8-menu-logística)
9. [Menu Fiscal](#9-menu-fiscal)
10. [Menu Integrações](#10-menu-integrações)
11. [Menu CRM](#11-menu-crm)
12. [Menu TV e Mídia](#12-menu-tv-e-mídia)
13. [Menu Marketing](#13-menu-marketing)
14. [Menu Inteligência Artificial](#14-menu-inteligência-artificial)
15. [Menu Configurações](#15-menu-configurações)
16. [Telas Públicas](#16-telas-públicas)
17. [Aplicativos Auxiliares](#17-aplicativos-auxiliares)
18. [Dicas para Testadores](#18-dicas-para-testadores)

---

## 1. VISÃO GERAL DO SISTEMA

### O que é o Sistema?

O sistema é uma plataforma completa de gestão para restaurantes, lanchonetes, pizzarias, bares e qualquer estabelecimento de food service. Ele permite controlar todas as operações do negócio em um único lugar.

### Para quem é?

- **Donos de restaurantes** que querem ter controle total do negócio
- **Gerentes** que precisam acompanhar vendas e equipe
- **Atendentes e caixas** que realizam as operações do dia a dia
- **Cozinheiros** que precisam ver os pedidos em tempo real
- **Entregadores** que fazem as entregas

### Principais Áreas do Sistema

| Área | O que faz |
|------|-----------|
| **Operacional** | Gerencia pedidos, mesas, comandas e entregas |
| **Financeiro** | Controla caixa, pagamentos e contas |
| **Cardápio** | Cadastra produtos, categorias e preços |
| **Marketing** | Cria promoções, campanhas e fidelidade |
| **Inteligência Artificial** | Sugestões automáticas e análises |
| **Configurações** | Personaliza o sistema para sua loja |

---

## 2. ACESSO E LOGIN

### 2.1 Tela de Login

**Caminho:** Página inicial do sistema

**O que é:** Tela onde você entra no sistema com seu usuário e senha.

**Como usar:**
1. Digite seu e-mail no campo "E-mail"
2. Digite sua senha no campo "Senha"
3. Clique no botão "Entrar"

**Resultado esperado:**
- ✅ Se os dados estiverem corretos: Você será direcionado ao Dashboard
- ❌ Se os dados estiverem incorretos: Aparece mensagem de erro

**Casos de Teste:**
| Cenário | Ação | Resultado Esperado |
|---------|------|-------------------|
| Login correto | Preencher dados válidos | Entrar no sistema |
| Senha errada | Preencher senha incorreta | Mensagem "Credenciais inválidas" |
| E-mail inválido | Preencher e-mail inexistente | Mensagem de erro |
| Campos vazios | Não preencher nada | Validação nos campos |

### 2.2 Recuperar Senha

**Como usar:**
1. Na tela de login, clique em "Esqueci minha senha"
2. Digite seu e-mail
3. Clique em "Enviar"
4. Verifique seu e-mail e siga as instruções

**Resultado esperado:** E-mail com link para criar nova senha

---

## 3. MENU PRINCIPAL - OPERAÇÕES

### 3.1 Dashboard (Painel Principal)

**Caminho:** Menu → Dashboard (ícone de casa)

**O que é:** Tela inicial que mostra um resumo de tudo que está acontecendo na loja hoje.

**O que você vê:**
- Total de vendas do dia
- Quantidade de pedidos
- Ticket médio (valor médio por pedido)
- Pedidos por status (aguardando, em preparo, prontos)
- Gráficos de desempenho

**Como usar:**
1. Acesse o Dashboard
2. Visualize os números do dia
3. Clique nos cards para ver mais detalhes

**Resultado esperado:** Números atualizados em tempo real conforme novos pedidos chegam

---

### 3.2 PDV Loja (Ponto de Venda)

**Caminho:** Menu → PDV Loja (ícone de loja)

**O que é:** Tela de vendas usada no balcão ou caixa para registrar vendas rápidas.

**O que você pode fazer:**
- Adicionar produtos ao carrinho
- Aplicar descontos
- Receber pagamentos (dinheiro, cartão, PIX)
- Emitir recibos
- Vincular a uma comanda existente

**Como usar passo a passo:**

**Para uma venda simples:**
1. Clique no produto desejado na lista
2. O produto aparece no carrinho à direita
3. Ajuste a quantidade se necessário (botões + e -)
4. Clique em "Pagamento"
5. Escolha a forma de pagamento
6. Digite o valor recebido (se dinheiro)
7. Clique em "Finalizar Venda"

**Para vincular a uma comanda:**
1. Clique em "Vincular Comanda"
2. Digite o número da comanda
3. Os itens da comanda aparecem no carrinho
4. Finalize o pagamento normalmente

**Resultado esperado:**
- Venda registrada no sistema
- Comanda fechada (se vinculada)
- Estoque atualizado
- Valor adicionado ao caixa

**Casos de Teste:**
| Cenário | Ação | Resultado Esperado |
|---------|------|-------------------|
| Venda simples | Adicionar produto e pagar | Venda registrada |
| Venda com desconto | Aplicar desconto de 10% | Valor recalculado |
| Troco | Pagamento maior que total | Mostrar troco |
| Pagamento múltiplo | Parte dinheiro, parte cartão | Aceitar dois métodos |

---

### 3.3 Terminal Operador

**Caminho:** Menu → Terminal Operador (ícone de layout)

**O que é:** Tela simplificada para atendentes e operadores realizarem tarefas rápidas.

**O que você pode fazer:**
- Ver mesas ocupadas
- Ver comandas abertas
- Lançar pedidos rapidamente
- Chamar garçom

**Como usar:**
1. Selecione uma mesa ou comanda
2. Adicione itens ao pedido
3. Confirme o pedido

**Resultado esperado:** Pedido enviado para a cozinha automaticamente

---

### 3.4 Painel de Desempenho

**Caminho:** Menu → Painel Desempenho (ícone de gráfico)

**O que é:** Tela que mostra indicadores de performance da operação em tempo real.

**O que você vê:**
- Tempo médio de preparo
- Tempo médio de entrega
- Pedidos atrasados
- Produtividade da equipe

**Como usar:**
1. Acesse o painel
2. Selecione o período (hoje, semana, mês)
3. Analise os indicadores

**Resultado esperado:** Gráficos e números atualizados mostrando a performance

---

### 3.5 Performance Operacional

**Caminho:** Menu → Performance Operacional (ícone de atividade)

**O que é:** Análise detalhada da operação com métricas avançadas.

**O que você vê:**
- Tempo de cada etapa do pedido
- Gargalos na operação
- Comparativo entre dias

**Quando usar:** Para identificar onde a operação pode melhorar

---

### 3.6 Pedidos

**Caminho:** Menu → Pedidos (ícone de lista)

**O que é:** Tela principal para gerenciar todos os pedidos do estabelecimento.

**O que você vê:**
- Lista de pedidos em formato kanban (colunas)
- Colunas: Novo, Em Preparo, Pronto, Saiu para Entrega, Entregue
- Detalhes de cada pedido

**Como usar:**

**Para ver um pedido:**
1. Clique no card do pedido
2. Veja todos os detalhes (itens, cliente, endereço)

**Para mover um pedido:**
1. Arraste o card para outra coluna
2. Ou clique e use os botões de ação

**Para imprimir:**
1. Clique no pedido
2. Clique em "Imprimir"

**Resultado esperado:**
- Pedidos organizados por status
- Atualização em tempo real quando novos pedidos chegam

**Casos de Teste:**
| Cenário | Ação | Resultado Esperado |
|---------|------|-------------------|
| Novo pedido | Receber pedido do app | Card aparece na coluna "Novo" |
| Mover status | Arrastar para "Em Preparo" | Pedido muda de coluna |
| Cancelar | Cancelar pedido | Pedido vai para cancelados |
| Imprimir | Clicar em imprimir | Impressão da comanda |

---

### 3.7 Pedido Ligação

**Caminho:** Menu → Pedido Ligação (ícone de telefone)

**O que é:** Tela para registrar pedidos feitos por telefone.

**O que você pode fazer:**
- Cadastrar cliente rapidamente
- Buscar cliente por telefone
- Montar o pedido
- Calcular taxa de entrega automaticamente
- Confirmar forma de pagamento

**Como usar passo a passo:**
1. Digite o telefone do cliente
2. Se já existe, os dados aparecem automaticamente
3. Se não existe, cadastre nome e endereço
4. Adicione os produtos ao pedido
5. Confirme a taxa de entrega
6. Escolha forma de pagamento
7. Finalize o pedido

**Resultado esperado:**
- Pedido criado e enviado para a cozinha
- Cliente cadastrado (se novo)
- Endereço salvo para próximas compras

---

### 3.8 Mesas

**Caminho:** Menu → Mesas (ícone de garfo e faca)

**O que é:** Gerenciamento do salão do restaurante com visão das mesas.

**O que você vê:**
- Mapa visual das mesas
- Status de cada mesa (livre, ocupada, reservada)
- Tempo de ocupação
- Valor da conta atual

**Cores das mesas:**
- 🟢 **Verde:** Mesa livre
- 🔴 **Vermelho:** Mesa ocupada
- 🟡 **Amarelo:** Mesa reservada
- 🟠 **Laranja:** Mesa aguardando pagamento

**Como usar:**

**Para abrir uma mesa:**
1. Clique na mesa livre
2. Clique em "Abrir Mesa"
3. Informe número de pessoas (opcional)

**Para adicionar itens:**
1. Clique na mesa ocupada
2. Clique em "Adicionar Itens"
3. Selecione os produtos
4. Confirme

**Para fechar a conta:**
1. Clique na mesa
2. Clique em "Fechar Conta"
3. Escolha forma de pagamento
4. Finalize

**Resultado esperado:**
- Mesas atualizadas em tempo real
- Valor da conta calculado automaticamente
- Histórico de itens consumidos

---

### 3.9 Comandas

**Caminho:** Menu → Comandas (ícone de etiqueta)

**O que é:** Gerenciamento de comandas individuais (fichas de consumo).

**O que você vê:**
- Lista de comandas abertas
- Número da comanda
- Valor total
- Status (aberta, fechada, em pagamento)

**Como usar:**

**Para criar nova comanda:**
1. Clique em "Nova Comanda"
2. Informe o número ou deixe automático
3. Vincule a uma mesa (opcional)
4. Clique em "Criar"

**Para adicionar itens:**
1. Encontre a comanda na lista
2. Clique nela
3. Clique em "Adicionar Item"
4. Selecione o produto
5. Confirme

**Para fechar comanda:**
1. Clique na comanda
2. Clique em "Fechar"
3. Escolha forma de pagamento
4. Finalize

**Resultado esperado:**
- Comanda criada com número único
- Itens registrados com horário
- Fechamento correto com pagamento

---

### 3.10 Self Check-out

**Caminho:** Menu → Self Check-out (ícone de recibo)

**O que é:** Tela para o cliente fechar e pagar sua própria conta.

**Como funciona:**
1. Cliente escaneia QR Code da mesa/comanda
2. Vê os itens consumidos
3. Escolhe forma de pagamento
4. Paga pelo celular

**Resultado esperado:**
- Cliente consegue pagar sem chamar garçom
- Pagamento registrado automaticamente
- Mesa/comanda liberada

---

### 3.11 Reservas

**Caminho:** Menu → Reservas (ícone de calendário)

**O que é:** Gerenciamento de reservas de mesas.

**O que você pode fazer:**
- Ver todas as reservas do dia
- Criar nova reserva
- Confirmar ou cancelar reservas
- Enviar lembrete ao cliente

**Como usar:**

**Para criar reserva:**
1. Clique em "Nova Reserva"
2. Escolha a data e horário
3. Informe nome e telefone do cliente
4. Selecione a mesa
5. Confirme

**Resultado esperado:**
- Reserva criada
- Mesa bloqueada para o horário
- Cliente notificado (se configurado)

---

### 3.12 Chamados Salão

**Caminho:** Menu → Chamados Salão (ícone de rádio)

**O que é:** Central de chamados feitos pelos clientes nas mesas.

**O que você vê:**
- Lista de chamados pendentes
- Tipo do chamado (garçom, conta, problema)
- Mesa de origem
- Tempo de espera

**Como usar:**
1. Veja os chamados na lista
2. Clique em "Atender"
3. Resolva a solicitação
4. Marque como "Concluído"

**Resultado esperado:**
- Chamado resolvido e arquivado
- Tempo de atendimento registrado

---

### 3.13 KDS Cozinha

**Caminho:** Menu → KDS Cozinha (ícone de chapéu de chef)

**O que é:** Tela de exibição para a cozinha ver os pedidos.

**O que você vê:**
- Pedidos organizados por tempo
- Itens de cada pedido
- Tempo decorrido
- Cores indicando urgência (verde, amarelo, vermelho)

**Como usar:**
1. Cozinheiro visualiza os pedidos
2. Inicia o preparo
3. Marca cada item como pronto
4. Quando tudo pronto, marca pedido como concluído

**Resultado esperado:**
- Pedidos saem da tela quando concluídos
- Próximos pedidos aparecem automaticamente

---

### 3.14 WhatsApp

**Caminho:** Menu → WhatsApp (ícone de mensagem)

**O que é:** Central de atendimento via WhatsApp.

**O que você pode fazer:**
- Ver conversas ativas
- Responder mensagens
- Receber pedidos via WhatsApp
- Enviar promoções

**Resultado esperado:**
- Mensagens sincronizadas com WhatsApp
- Pedidos criados automaticamente

---

### 3.15 Chat Online

**Caminho:** Menu → Chat Online (ícone de chat)

**O que é:** Monitor de conversas do chat do site/app.

**O que você vê:**
- Conversas em andamento
- Histórico de conversas
- Clientes aguardando atendimento

---

### 3.16 Clientes

**Caminho:** Menu → Clientes (ícone de pessoa)

**O que é:** Cadastro completo de clientes.

**O que você pode fazer:**
- Ver todos os clientes
- Cadastrar novo cliente
- Editar informações
- Ver histórico de compras
- Ver pontos de fidelidade

**Como cadastrar cliente:**
1. Clique em "Novo Cliente"
2. Preencha nome, telefone, e-mail
3. Adicione endereço (para delivery)
4. Salve

**Resultado esperado:**
- Cliente cadastrado
- Endereço disponível para próximos pedidos
- Histórico de compras acessível

---

### 3.17 Avaliações

**Caminho:** Menu → Avaliações (ícone de estrela)

**O que é:** Gerenciamento de avaliações dos clientes.

**O que você vê:**
- Nota média do estabelecimento
- Lista de avaliações recentes
- Comentários dos clientes
- Respostas às avaliações

**Como responder:**
1. Encontre a avaliação
2. Clique em "Responder"
3. Digite sua resposta
4. Envie

---

### 3.18 Entregadores

**Caminho:** Menu → Entregadores (ícone de moto)

**O que é:** Cadastro e gestão de entregadores.

**O que você pode fazer:**
- Cadastrar entregadores
- Ver status (disponível, em rota, offline)
- Atribuir entregas
- Ver histórico de entregas

**Como cadastrar:**
1. Clique em "Novo Entregador"
2. Preencha nome, telefone, documento
3. Adicione foto (opcional)
4. Defina taxa por entrega
5. Salve

---

### 3.19 Expedição

**Caminho:** Menu → Expedição (ícone de caminhão)

**O que é:** Painel de controle de saída de entregas.

**O que você vê:**
- Pedidos prontos para sair
- Entregadores disponíveis
- Rotas otimizadas

**Como usar:**
1. Veja pedidos aguardando expedição
2. Selecione o entregador
3. Agrupe pedidos por rota (opcional)
4. Clique em "Despachar"

---

### 3.20 Crachá Entregador

**Caminho:** Menu → Crachá Entregador (ícone de identificação)

**O que é:** Geração de crachás digitais para entregadores.

**Como usar:**
1. Selecione o entregador
2. Clique em "Gerar Crachá"
3. Imprima ou baixe

---

### 3.21 Ranking Entregas

**Caminho:** Menu → Ranking Entregas (ícone de troféu)

**O que é:** Ranking de desempenho dos entregadores.

**O que você vê:**
- Posição de cada entregador
- Número de entregas
- Avaliação média
- Tempo médio de entrega

---

### 3.22 Acerto

**Caminho:** Menu → Acerto (ícone de calculadora)

**O que é:** Fechamento financeiro com entregadores.

**O que você pode fazer:**
- Ver valores a pagar ao entregador
- Descontar adiantamentos
- Registrar pagamento
- Gerar recibo

---

### 3.23 Relatórios

**Caminho:** Menu → Relatórios (ícone de gráfico)

**O que é:** Central de relatórios do sistema.

**Relatórios disponíveis:**
- Vendas por período
- Produtos mais vendidos
- Desempenho por horário
- Relatório de entregas
- Relatório de mesas
- Relatório de funcionários

**Como gerar:**
1. Escolha o tipo de relatório
2. Selecione o período
3. Aplique filtros (opcional)
4. Clique em "Gerar"
5. Exporte em PDF ou Excel (opcional)

---

### 3.24 BI Avançado

**Caminho:** Menu → BI Avançado (ícone de tendência)

**O que é:** Business Intelligence com análises avançadas.

**O que você vê:**
- Gráficos interativos
- Comparativos entre períodos
- Previsões de vendas
- Análise de tendências

---

### 3.25 Dashboard Tempos

**Caminho:** Menu → Dashboard Tempos (ícone de timer)

**O que é:** Painel focado em tempos de operação.

**O que você vê:**
- Tempo médio de preparo por produto
- Tempo de espera na fila
- Pedidos atrasados
- Meta vs realizado

---

### 3.26 Fidelidade

**Caminho:** Menu → Fidelidade (ícone de estrela)

**O que é:** Programa de fidelidade para clientes.

**O que você pode fazer:**
- Ver pontos dos clientes
- Criar regras de pontuação
- Definir prêmios de resgate
- Ver resgates realizados

---

### 3.27 Mensagens

**Caminho:** Menu → Mensagens (ícone de rádio)

**O que é:** Mensagens internas entre equipe.

**Como usar:**
1. Clique em "Nova Mensagem"
2. Selecione destinatário ou "Todos"
3. Digite a mensagem
4. Envie

---

### 3.28 Auditoria

**Caminho:** Menu → Auditoria (ícone de atividade)

**O que é:** Registro de todas as ações feitas no sistema.

**O que você vê:**
- Quem fez cada ação
- Quando foi feita
- O que foi alterado
- Valores anteriores e novos

**Para que serve:** Rastrear alterações e identificar problemas

---

## 4. MENU FINANCEIRO

### 4.1 Financeiro (Dashboard)

**Caminho:** Menu → Financeiro (ícone de calculadora)

**O que é:** Visão geral das finanças do negócio.

**O que você vê:**
- Receitas do período
- Despesas do período
- Lucro líquido
- Contas a pagar/receber
- Fluxo de caixa

---

### 4.2 Controle de Caixa

**Caminho:** Menu → Controle de Caixa

**O que é:** Abertura, movimentação e fechamento do caixa.

**Operações:**

**Abrir Caixa:**
1. Clique em "Abrir Caixa"
2. Informe o valor inicial (fundo de troco)
3. Confirme

**Fazer Sangria (retirada):**
1. Clique em "Sangria"
2. Informe o valor e motivo
3. Confirme

**Fazer Suprimento (entrada):**
1. Clique em "Suprimento"
2. Informe o valor e motivo
3. Confirme

**Fechar Caixa:**
1. Clique em "Fechar Caixa"
2. Conte o dinheiro físico
3. Informe o valor contado
4. Sistema calcula diferença
5. Confirme

**Resultado esperado:**
- Caixa aberto/fechado corretamente
- Movimentações registradas
- Diferença calculada (sobra/falta)

---

### 4.3 Histórico de Caixas

**Caminho:** Menu → Histórico Caixas

**O que é:** Consulta de caixas anteriores.

**O que você vê:**
- Data e operador de cada caixa
- Valor inicial e final
- Todas as movimentações
- Diferenças encontradas

---

### 4.4 Formas de Pagamento

**Caminho:** Menu → Formas Pagamento

**O que é:** Cadastro das formas de pagamento aceitas.

**Formas comuns:**
- Dinheiro
- Cartão de Crédito
- Cartão de Débito
- PIX
- Vale Alimentação
- Vale Refeição

**Como cadastrar:**
1. Clique em "Nova Forma"
2. Digite o nome
3. Configure taxas (se houver)
4. Ative ou desative
5. Salve

---

### 4.5 Contas Bancárias

**Caminho:** Menu → Contas Bancárias

**O que é:** Cadastro das contas do estabelecimento.

**Como usar:**
1. Cadastre cada conta bancária
2. Informe banco, agência, conta
3. Defina saldo inicial
4. Use para reconciliação

---

### 4.6 Contas a Pagar

**Caminho:** Menu → Contas a Pagar

**O que é:** Gerenciamento de despesas e contas.

**Como usar:**

**Cadastrar conta:**
1. Clique em "Nova Conta"
2. Informe descrição, valor, vencimento
3. Selecione categoria
4. Salve

**Pagar conta:**
1. Encontre a conta na lista
2. Clique em "Pagar"
3. Informe data e forma de pagamento
4. Confirme

---

### 4.7 Plano de Contas

**Caminho:** Menu → Plano de Contas

**O que é:** Categorias para organizar receitas e despesas.

**Categorias comuns:**
- Receitas: Vendas, Delivery, Taxa de Serviço
- Despesas: Fornecedores, Salários, Aluguel, Energia

---

### 4.8 Fiado

**Caminho:** Menu → Fiado

**O que é:** Controle de vendas a prazo (fiado).

**Como usar:**
1. Veja clientes com saldo devedor
2. Registre novos fiados
3. Receba pagamentos parciais
4. Controle limite de crédito

---

### 4.9 Estoque

**Caminho:** Menu → Estoque

**O que é:** Controle básico de estoque.

**O que você pode fazer:**
- Ver quantidade em estoque
- Registrar entradas e saídas
- Configurar estoque mínimo
- Receber alertas

---

### 4.10 ERP Financeiro

**Caminho:** Menu → ERP Financeiro

**O que é:** Sistema completo de gestão financeira empresarial.

**Funcionalidades:**
- DRE (Demonstração de Resultado)
- Fluxo de caixa projetado
- Centro de custos
- Orçamentos
- Relatórios gerenciais

---

## 5. MENU ERP E ESTOQUE

### 5.1 Dashboard ERP

**O que é:** Visão geral do ERP de estoque e compras.

---

### 5.2 Itens ERP

**O que é:** Cadastro de insumos e matérias-primas.

**Como usar:**
1. Cadastre cada item (farinha, tomate, etc.)
2. Defina unidade de medida
3. Configure estoque mínimo
4. Vincule a fornecedores

---

### 5.3 Fornecedores

**O que é:** Cadastro de fornecedores.

**Informações:**
- Nome e CNPJ
- Contato
- Produtos fornecidos
- Condições de pagamento

---

### 5.4 Compras

**O que é:** Registro de compras de insumos.

**Como registrar:**
1. Selecione fornecedor
2. Adicione itens e quantidades
3. Informe valores e nota fiscal
4. Confirme entrada no estoque

---

### 5.5 Fichas Técnicas

**O que é:** Receitas dos produtos com custos.

**Como criar:**
1. Selecione o produto final
2. Adicione ingredientes e quantidades
3. Sistema calcula custo automaticamente
4. Use para precificação

---

### 5.6 Estoque ERP

**O que é:** Controle detalhado de estoque.

**Funcionalidades:**
- Posição atual de estoque
- Lotes e validades
- Múltiplos depósitos
- Reservas

---

### 5.7 Movimentações

**O que é:** Histórico de entradas e saídas de estoque.

---

### 5.8 Inventário

**O que é:** Contagem física de estoque.

**Como fazer:**
1. Inicie um inventário
2. Conte cada item fisicamente
3. Registre quantidades
4. Sistema calcula diferenças
5. Aprove ajustes

---

### 5.9 CMV

**O que é:** Custo de Mercadoria Vendida.

**O que mostra:**
- Custo real de cada venda
- Margem de lucro por produto
- Análise de rentabilidade

---

### 5.10 Precificação

**O que é:** Formação de preços baseada em custos.

**Como usar:**
1. Selecione o produto
2. Veja custo da ficha técnica
3. Defina margem desejada
4. Sistema calcula preço sugerido

---

### 5.11 Lucro

**O que é:** Análise de lucratividade.

---

## 6. MENU CARDÁPIO

### 6.1 Categorias

**Caminho:** Menu → Categorias

**O que é:** Grupos principais do cardápio (ex: Pizzas, Bebidas, Sobremesas).

**Como criar:**
1. Clique em "Nova Categoria"
2. Digite o nome
3. Adicione imagem (opcional)
4. Defina ordem de exibição
5. Ative/desative
6. Salve

---

### 6.2 Subcategorias

**O que é:** Divisões dentro das categorias.

**Exemplo:** 
- Categoria: Pizzas
- Subcategorias: Tradicionais, Especiais, Doces

---

### 6.3 Produtos

**Caminho:** Menu → Produtos

**O que é:** Cadastro de todos os itens do cardápio.

**Como cadastrar:**
1. Clique em "Novo Produto"
2. Digite nome e descrição
3. Selecione categoria
4. Defina preço
5. Adicione foto
6. Configure opcionais (se tiver)
7. Salve

**Informações importantes:**
- **Nome:** Claro e objetivo
- **Descrição:** Ingredientes e detalhes
- **Preço:** Em reais
- **Foto:** JPG ou PNG, boa qualidade
- **Disponibilidade:** Ativo/Inativo

---

### 6.4 Sabores

**O que é:** Sabores para produtos como pizza.

**Como usar:**
1. Cadastre cada sabor
2. Defina ingredientes
3. Configure preço adicional (se houver)

---

### 6.5 Grupos Opcionais

**O que é:** Extras e adicionais para produtos.

**Exemplos:**
- Adicionais de pizza (borda recheada)
- Molhos extras
- Acompanhamentos

**Como criar:**
1. Crie o grupo (ex: "Escolha o molho")
2. Adicione opções (ketchup, mostarda, etc.)
3. Defina preços adicionais
4. Configure mínimo/máximo de escolhas
5. Vincule aos produtos

---

### 6.6 Cardápio Avançado

**O que é:** Configurações avançadas do cardápio digital.

**Funcionalidades:**
- Mostrar calorias
- Exibir alérgenos
- Tags especiais (vegano, sem glúten)
- Harmonização de vinhos

---

### 6.7 Destaques Sabor

**O que é:** Grupos de sabores em destaque.

---

### 6.8 Ações em Lote

**O que é:** Alterações em massa nos produtos.

**O que você pode fazer:**
- Ativar/desativar vários produtos
- Alterar categoria de vários produtos
- Aplicar desconto em lote

---

### 6.9 Alterações em Lote

**O que é:** Edições em massa com mais opções.

---

### 6.10 Importar/Exportar

**O que é:** Importação e exportação de dados por planilha.

**Como usar:**
1. Baixe o modelo de planilha
2. Preencha os dados
3. Faça upload
4. Revise e confirme

---

## 7. MENU GESTÃO DE PESSOAS

### 7.1 Funcionários

**Caminho:** Menu → Funcionários

**O que é:** Cadastro de funcionários.

**Informações:**
- Nome completo
- Cargo (garçom, cozinheiro, etc.)
- Telefone e e-mail
- Data de admissão
- Salário
- Tipo de comissão

**Como cadastrar:**
1. Clique em "Novo Funcionário"
2. Preencha os dados
3. Defina departamento e cargo
4. Configure comissão (se aplicável)
5. Salve

---

### 7.2 Escalas

**Caminho:** Menu → Escalas

**O que é:** Gerenciamento de turnos de trabalho.

**Como usar:**
1. Veja o calendário semanal
2. Arraste funcionários para os turnos
3. Configure horários
4. Salve a escala

---

### 7.3 Comissões

**Caminho:** Menu → Comissões

**O que é:** Cálculo de comissões dos funcionários.

**O que você vê:**
- Vendas de cada funcionário
- Valor da comissão calculado
- Status (pendente, aprovado, pago)

---

### 7.4 Ativos

**Caminho:** Menu → Ativos

**O que é:** Cadastro de equipamentos e bens.

**Exemplos:**
- Fogões
- Geladeiras
- Computadores
- Ar condicionado

---

### 7.5 Manutenções

**Caminho:** Menu → Manutenções

**O que é:** Controle de manutenções dos ativos.

**Como usar:**
1. Registre manutenções realizadas
2. Agende próximas manutenções
3. Receba alertas de vencimento

---

## 8. MENU LOGÍSTICA

### 8.1 Rotas de Entrega

**O que é:** Otimização de rotas para entregas.

**Como usar:**
1. Veja pedidos para entrega
2. Sistema sugere melhor rota
3. Atribua ao entregador
4. Acompanhe em tempo real

---

### 8.2 Sugestões de Compra

**O que é:** IA sugere o que comprar baseado no estoque e vendas.

**O que você vê:**
- Itens com estoque baixo
- Quantidade sugerida
- Fornecedor recomendado
- Previsão de consumo

---

### 8.3 Cotações

**O que é:** Solicitação de cotações a fornecedores.

**Como usar:**
1. Crie uma solicitação
2. Adicione itens e quantidades
3. Envie para fornecedores
4. Receba e compare propostas
5. Aprove a melhor

---

## 9. MENU FISCAL

### 9.1 Documentos Fiscais

**O que é:** Emissão de notas fiscais.

**Tipos:**
- NFC-e (cupom fiscal eletrônico)
- NF-e (nota fiscal eletrônica)
- SAT (São Paulo)

---

### 9.2 Configuração Fiscal

**O que é:** Parâmetros para emissão de documentos fiscais.

**Configurações:**
- Dados da empresa
- Certificado digital
- Séries de notas
- Tributação

---

## 10. MENU INTEGRAÇÕES

### 10.1 Hub de Integrações

**O que é:** Central de conexões com outros sistemas.

**Integrações disponíveis:**
- iFood
- Rappi
- Uber Eats
- WhatsApp Business
- Sistemas de pagamento

---

### 10.2 WhatsApp Center

**O que é:** Configuração do WhatsApp Business.

---

### 10.3 Pagamentos

**O que é:** Integração com sistemas de pagamento.

**Exemplos:**
- PIX automático
- Maquininhas TEF
- Gateways online

---

### 10.4 Marketplace

**O que é:** Gerenciamento de apps de delivery.

---

### 10.5 Pedidos Marketplace

**O que é:** Pedidos vindos dos apps de delivery.

---

## 11. MENU CRM

### 11.1 CRM Dashboard

**O que é:** Visão geral do relacionamento com clientes.

**O que você vê:**
- Novos leads
- Clientes ativos
- Oportunidades
- Funil de vendas

---

### 11.2 Leads

**O que é:** Clientes em potencial.

**Como usar:**
1. Cadastre novos leads
2. Classifique por interesse
3. Faça follow-up
4. Converta em cliente

---

### 11.3 Pipeline

**O que é:** Funil de vendas visual.

**Estágios típicos:**
- Novo contato
- Interesse demonstrado
- Proposta enviada
- Negociação
- Fechado

---

### 11.4 Clientes CRM

**O que é:** Visão avançada de clientes.

---

### 11.5 Atividades

**O que é:** Registro de interações com clientes.

**Exemplos:**
- Ligações
- E-mails
- Reuniões
- Visitas

---

### 11.6 Automações CRM

**O que é:** Ações automáticas baseadas em gatilhos.

**Exemplos:**
- Enviar e-mail de boas-vindas
- Lembrete de aniversário
- Oferta para cliente inativo

---

## 12. MENU TV E MÍDIA

### 12.1 Telas de TV

**O que é:** Gerenciamento de TVs do estabelecimento.

**Como usar:**
1. Cadastre cada TV
2. Defina o que exibir:
   - Menu digital
   - Promoções
   - Senhas de atendimento
3. Gere o link para a TV

---

### 12.2 Banners TV

**O que é:** Criação de banners para exibir nas TVs.

**Como criar:**
1. Clique em "Novo Banner"
2. Faça upload da imagem
3. Defina período de exibição
4. Selecione em quais TVs mostrar
5. Salve

---

## 13. MENU MARKETING

### 13.1 Hub Marketing

**O que é:** Central de ações de marketing.

---

### 13.2 Campanhas Marketing

**O que é:** Criação de campanhas promocionais.

**Tipos:**
- Desconto em produtos
- Cupom de desconto
- Frete grátis
- Combo promocional

---

### 13.3 Automações Marketing

**O que é:** Marketing automático baseado em comportamento.

**Exemplos:**
- Desconto para primeira compra
- Oferta no aniversário
- Reativação de cliente sumido

---

### 13.4 Campanhas

**O que é:** Gerenciamento de campanhas ativas.

---

### 13.5 Recompra

**O que é:** Estratégias para cliente comprar novamente.

**Ações:**
- Enviar lembrete após X dias
- Oferecer desconto progressivo
- Programa de pontos

---

### 13.6 Programa de Indicação

**O que é:** Sistema "indique um amigo".

**Como funciona:**
1. Cliente recebe código de indicação
2. Amigo usa o código na compra
3. Ambos ganham benefício

---

### 13.7 Gamificação

**O que é:** Elementos de jogo para engajar clientes.

**Exemplos:**
- Conquistar medalhas
- Subir de nível
- Desafios e missões
- Ranking de clientes

---

### 13.8 Destaque Horário

**O que é:** Promoções por horário específico.

**Exemplo:** Happy Hour das 17h às 19h

---

### 13.9 Marketing (Geral)

**O que é:** Visão geral das ações de marketing.

---

### 13.10 Roleta de Prêmios

**O que é:** Roleta interativa para clientes concorrerem a prêmios.

**Como usar:**
1. Configure os prêmios
2. Defina probabilidades
3. Cliente gira a roleta
4. Ganha o prêmio sorteado

---

### 13.11 Cupons

**O que é:** Criação e gerenciamento de cupons de desconto.

**Como criar:**
1. Clique em "Novo Cupom"
2. Defina o código (ex: PROMO10)
3. Configure o desconto (% ou R$)
4. Defina validade
5. Limite de uso (opcional)
6. Salve

---

## 14. MENU INTELIGÊNCIA ARTIFICIAL

### 14.1 IA Operacional

**O que é:** Sugestões de IA para melhorar a operação.

**O que a IA sugere:**
- Produtos para promover
- Horários de pico
- Ajustes de estoque
- Problemas detectados

---

### 14.2 IA Recomendações

**O que é:** Recomendações personalizadas.

**Exemplos:**
- Sugestões de combos
- Cross-selling (venda cruzada)
- Up-selling (venda maior)

---

### 14.3 Central de Sugestões

**O que é:** Todas as sugestões da IA em um lugar.

**Como usar:**
1. Veja as sugestões
2. Aceite ou recuse cada uma
3. IA aprende com suas escolhas

---

### 14.4 Marketing AI Posts

**O que é:** IA cria posts para redes sociais.

**Como usar:**
1. Selecione o produto
2. IA gera sugestão de post
3. Edite se necessário
4. Publique nas redes

---

### 14.5 Previsão de Churn

**O que é:** IA prevê quais clientes podem parar de comprar.

**O que você vê:**
- Clientes em risco
- Motivo provável
- Ação sugerida

---

### 14.6 Chatbot WhatsApp

**O que é:** Robô que atende no WhatsApp automaticamente.

**Configurações:**
- Mensagem de boas-vindas
- Horário de atendimento
- Respostas automáticas
- Quando transferir para humano

---

### 14.7 Cardápio Criativo

**O que é:** IA sugere novos produtos e combinações.

---

### 14.8 Agenda TV

**O que é:** IA programa automaticamente o que exibir nas TVs.

---

### 14.9 Previsão de Demanda

**O que é:** IA prevê vendas futuras.

**Para que serve:**
- Planejar compras
- Escalar equipe
- Evitar desperdício

---

### 14.10 Precificação Dinâmica

**O que é:** Preços que mudam baseado em demanda.

**Exemplo:** Preço menor em horários de baixo movimento

---

### 14.11 Smart KDS

**O que é:** KDS inteligente que prioriza pedidos.

---

### 14.12 Autoatendimento IA

**O que é:** Totem com atendimento por IA.

---

### 14.13 Voice AI Atendente

**O que é:** Atendente virtual por voz.

**Funciona para:**
- Atender telefone
- Receber pedidos
- Responder dúvidas

---

### 14.14 Fila Inteligente

**O que é:** Gerenciamento inteligente de fila de espera.

---

### 14.15 AI Concierge

**O que é:** Assistente virtual completo.

**Capacidades:**
- Responder sobre o cardápio
- Fazer reservas
- Sugerir pratos
- Informar alergênicos

---

### 14.16 Upselling Preditivo

**O que é:** IA sugere adicionais baseado no histórico.

---

### 14.17 Performance Equipe

**O que é:** Análise de desempenho dos funcionários.

---

### 14.18 QA Testes

**O que é:** Área de testes do sistema.

---

## 15. MENU CONFIGURAÇÕES

### 15.1 Empresa

**O que é:** Dados cadastrais do estabelecimento.

**Informações:**
- Nome e CNPJ
- Endereço
- Telefone e e-mail
- Horário de funcionamento
- Logo

---

### 15.2 Clientes (Config)

**O que é:** Configurações de cadastro de clientes.

**Opções:**
- Campos obrigatórios
- Validação de dados
- Termos de aceite

---

### 15.3 Caixa (Config)

**O que é:** Configurações do controle de caixa.

**Opções:**
- Valor mínimo de abertura
- Exigir fechamento
- Limitar sangrias

---

### 15.4 Pedidos (Config)

**O que é:** Configurações de pedidos.

**Opções:**
- Impressão automática
- Numeração
- Status padrão

---

### 15.5 Mesas (Config)

**O que é:** Configurações de mesas.

**Opções:**
- Tempo de ocupação máximo
- Taxa de serviço
- Divisão de conta

---

### 15.6 Reservas (Config)

**O que é:** Configurações de reservas.

**Opções:**
- Antecedência mínima
- Tolerância de atraso
- Confirmação automática

---

### 15.7 Tablet Autoatendimento

**O que é:** Configurações para tablets de pedido na mesa.

---

### 15.8 Totem Autoatendimento

**O que é:** Configurações para totens de autoatendimento.

**Opções:**
- Tela inicial
- Fluxo de pedido
- Formas de pagamento
- Impressão de senha

---

### 15.9 TV Display

**O que é:** Configurações de exibição nas TVs.

---

### 15.10 Pedido Online

**O que é:** Configurações do cardápio digital.

**Opções:**
- URL personalizada
- Cores e logo
- Horário de disponibilidade
- Taxa de entrega

---

### 15.11 Taxas de Entrega

**O que é:** Configuração de taxas por região.

**Como configurar:**
1. Defina zonas de entrega
2. Configure valor por zona
3. Ou use distância em km
4. Defina pedido mínimo

---

### 15.12 Rastreio GPS

**O que é:** Acompanhamento de entregadores em tempo real.

---

### 15.13 Pizza

**O que é:** Configurações específicas para pizzarias.

**Opções:**
- Tamanhos (broto, média, grande)
- Sabores por tamanho
- Cálculo de preço (maior, média, etc.)
- Bordas

---

### 15.14 Enólogo Virtual

**O que é:** Sommelier virtual para sugerir vinhos.

---

### 15.15 Branding

**O que é:** Personalização visual do sistema.

**O que você pode mudar:**
- Cores principais
- Logo
- Fontes
- Estilo geral

---

### 15.16 Integrações (Config)

**O que é:** Configuração de APIs e conexões.

---

### 15.17 TEF / Maquininhas

**O que é:** Integração com máquinas de cartão.

---

### 15.18 Impressão

**O que é:** Configuração de impressoras.

**Tipos:**
- Impressora de cozinha
- Impressora de caixa
- Impressora de expedição

**Como configurar:**
1. Cadastre cada impressora
2. Defina o IP ou porta
3. Configure o que imprime
4. Teste a impressão

---

### 15.19 Balança

**O que é:** Integração com balanças eletrônicas.

---

### 15.20 Roleta (Config)

**O que é:** Configurações da roleta de prêmios.

---

### 15.21 IA (Config)

**O que é:** Configurações dos recursos de IA.

---

### 15.22 Layout Cardápio

**O que é:** Personalização do cardápio digital.

---

### 15.23 Pânico

**O que é:** Botão de emergência para situações críticas.

---

### 15.24 Sons

**O que é:** Configuração de alertas sonoros.

**Sons disponíveis:**
- Novo pedido
- Chamado de mesa
- Alerta de atraso

---

### 15.25 Usuários

**O que é:** Gerenciamento de usuários do sistema.

**Como criar usuário:**
1. Clique em "Novo Usuário"
2. Preencha nome e e-mail
3. Defina senha inicial
4. Selecione perfil de acesso
5. Salve

---

### 15.26 Perfis de Acesso

**O que é:** Definição de permissões por tipo de usuário.

**Perfis comuns:**
- Administrador (acesso total)
- Gerente (sem financeiro crítico)
- Caixa (apenas caixa e pedidos)
- Garçom (apenas mesas e comandas)
- Cozinha (apenas KDS)

---

### 15.27 Meus Links

**O que é:** Links públicos do estabelecimento.

**Links gerados:**
- Cardápio digital
- Reservas online
- Avaliação
- TV Menu

---

### 15.28 Minha Assinatura

**O que é:** Informações do plano contratado.

---

## 16. TELAS PÚBLICAS

Estas são telas acessadas por clientes ou dispositivos externos.

### 16.1 Cardápio Digital

**URL:** /cardapio/[slug] ou /m/[token]

**O que é:** Cardápio online para clientes.

**Funcionalidades:**
- Ver produtos com fotos
- Filtrar por categoria
- Adicionar ao carrinho
- Fazer pedido

---

### 16.2 Reserva Online

**URL:** /reservas/[slug]

**O que é:** Página para clientes fazerem reservas.

---

### 16.3 TV Menu

**URL:** /tv/[token]

**O que é:** Exibição do cardápio em TVs do estabelecimento.

---

### 16.4 Painel de Senhas

**URL:** /painel/[token]

**O que é:** Tela que mostra senhas sendo chamadas.

---

### 16.5 KDS Público

**URL:** /kds/[token]

**O que é:** Tela de cozinha para dispositivos externos.

---

### 16.6 QR Code Mesa

**URL:** /mesa/[numero]/[token]

**O que é:** Página acessada ao escanear QR da mesa.

---

### 16.7 QR Code Comanda

**URL:** /comanda/[numero]/[token]

**O que é:** Página acessada ao escanear QR da comanda.

---

### 16.8 Avaliação

**URL:** /avaliacao/[token]

**O que é:** Página para cliente avaliar o atendimento.

---

### 16.9 Totem Autoatendimento

**URL:** /totem/[token]

**O que é:** Interface do totem de autoatendimento.

---

### 16.10 Autoatendimento Tablet

**URL:** /tablet/[token]

**O que é:** Interface do tablet na mesa.

---

### 16.11 Opt-Out

**URL:** /optout/[token]

**O que é:** Página para cliente cancelar comunicações.

---

## 17. APLICATIVOS AUXILIARES

### 17.1 App do Garçom

**O que é:** Aplicativo móvel para garçons.

**Funcionalidades:**
- Ver mesas do salão
- Abrir e fechar mesas
- Lançar pedidos
- Chamar cozinha
- Imprimir conta

---

### 17.2 App do Entregador

**O que é:** Aplicativo para entregadores.

**Funcionalidades:**
- Ver entregas atribuídas
- Navegar até endereço
- Confirmar entrega
- Registrar problemas

---

### 17.3 Terminal de Balança

**O que é:** Integração com balanças para produtos pesados.

---

## 18. DICAS PARA TESTADORES

### Fluxos Principais para Testar

#### Fluxo 1: Venda no Balcão
1. Login como caixa
2. Abrir caixa com fundo de troco
3. PDV Loja → Adicionar produtos
4. Receber pagamento
5. Fechar caixa ao final do dia
6. **Verificar:** Relatório de vendas bate com caixa

#### Fluxo 2: Atendimento de Mesa
1. Login como gerente
2. Abrir mesa para cliente
3. Lançar pedidos na mesa
4. Pedidos aparecem no KDS
5. Cozinha marca como pronto
6. Fechar conta da mesa
7. **Verificar:** Mesa volta a ficar livre

#### Fluxo 3: Pedido Delivery
1. Cliente faz pedido pelo cardápio digital
2. Pedido aparece no kanban
3. Cozinha prepara (KDS)
4. Expedição atribui entregador
5. Entregador confirma entrega
6. **Verificar:** Tempo registrado corretamente

#### Fluxo 4: Comanda
1. Criar nova comanda
2. Adicionar itens
3. Cliente continua consumindo (adicionar mais itens)
4. Fechar e pagar comanda
5. **Verificar:** Todos os itens na conta final

### Lista de Verificação por Área

#### ✅ Dashboard
- [ ] Números atualizam em tempo real
- [ ] Gráficos carregam corretamente
- [ ] Período pode ser alterado

#### ✅ Pedidos
- [ ] Novos pedidos aparecem automaticamente
- [ ] Arrastar pedido muda status
- [ ] Impressão funciona
- [ ] Cancelamento registra motivo

#### ✅ Caixa
- [ ] Abertura exige valor inicial
- [ ] Sangria desconta do saldo
- [ ] Suprimento soma ao saldo
- [ ] Fechamento calcula diferença

#### ✅ Produtos
- [ ] Cadastro salva corretamente
- [ ] Foto faz upload
- [ ] Preço aceita centavos
- [ ] Categoria vincula corretamente

#### ✅ Clientes
- [ ] Cadastro com validação de telefone
- [ ] Busca por nome funciona
- [ ] Histórico de pedidos aparece
- [ ] Endereço salva para delivery

### Erros Comuns e Como Reportar

**Ao encontrar um erro, anote:**
1. O que você estava fazendo (passo a passo)
2. O que esperava acontecer
3. O que realmente aconteceu
4. Se apareceu mensagem de erro, qual era
5. Screenshot da tela

**Formato de reporte:**
```
ERRO: [Título curto]
ÁREA: [Menu/Página]
PASSOS:
1. Acessei...
2. Cliquei em...
3. Preenchi...
ESPERADO: [O que deveria acontecer]
RESULTADO: [O que aconteceu]
EVIDÊNCIA: [Screenshot anexo]
```

---

## GLOSSÁRIO

| Termo | Significado |
|-------|-------------|
| **Dashboard** | Painel principal com resumo das informações |
| **PDV** | Ponto de Venda - onde se registra as vendas |
| **KDS** | Kitchen Display System - tela da cozinha |
| **Comanda** | Ficha individual de consumo do cliente |
| **Delivery** | Pedidos para entrega |
| **Kanban** | Visualização em colunas (status) |
| **CRM** | Gestão de Relacionamento com Cliente |
| **ERP** | Sistema de Gestão Empresarial |
| **CMV** | Custo de Mercadoria Vendida |
| **TEF** | Transferência Eletrônica de Fundos (maquininha) |
| **NFC-e** | Nota Fiscal de Consumidor Eletrônica |
| **Sangria** | Retirada de dinheiro do caixa |
| **Suprimento** | Entrada de dinheiro no caixa |
| **Churn** | Cliente que deixou de comprar |
| **Lead** | Potencial cliente |
| **Upselling** | Vender produto maior/melhor |
| **Cross-selling** | Vender produto complementar |

---

## CONTATO PARA SUPORTE

Em caso de dúvidas durante os testes:
- Consulte este manual
- Acesse a central de ajuda no sistema
- Entre em contato com a equipe de desenvolvimento

---

**Documento gerado em:** Janeiro 2026  
**Versão do Sistema:** 1.0  
**Este documento é confidencial e de uso interno.**
