# Zoopi Print Agent v3.0

Agente de Impressão Local para o sistema Zoopi. Permite impressão silenciosa em impressoras térmicas (ESC/POS) conectadas via USB ou Rede.

## Características

- 🖨️ Suporte a impressoras USB e Rede (IP)
- 📄 Formatação automática ESC/POS (negrito, tamanhos, alinhamento)
- 🔄 Conexão com Supabase Realtime para fila de impressão
- 🌐 Servidor HTTP local para impressão direta
- 📊 Interface gráfica para configuração
- 🔔 Roda em segundo plano (system tray)

## Instalação

### Requisitos

- Node.js 18+
- npm ou yarn

### Desenvolvimento

```bash
# Instalar dependências
cd print-agent-v3
npm install

# Iniciar em modo desenvolvimento
npm start
```

### Build para Produção

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

O executável será gerado na pasta `dist/`.

## Configuração

### 1. Impressoras

Na aba "Impressoras", clique em "Adicionar" para configurar uma nova impressora:

- **Nome**: Identificação da impressora (ex: "Cozinha")
- **Categoria**: Tipo de uso (cozinha, bar, caixa, etc.)
- **Tipo de Conexão**:
  - USB: Selecione a impressora do sistema
  - Rede: Informe IP e porta (padrão 9100)
- **Largura do Papel**: 80mm ou 58mm

### 2. Conexão com Supabase

Na aba "Conexão", configure:

- **URL do Supabase**: URL do projeto Supabase
- **Chave Anônima**: anon key do projeto
- **ID da Empresa**: UUID da empresa no banco de dados
- **Porta Local**: Porta do servidor HTTP (padrão 9898)

## API do Servidor Local

O agente expõe endpoints HTTP na rede local:

### GET /health

Verifica se o agente está rodando.

```json
{
  "status": "ok",
  "version": "3.0.0",
  "timestamp": "2024-01-27T12:00:00.000Z"
}
```

### GET /printers

Lista impressoras configuradas.

### POST /print

Envia um job de impressão.

```json
{
  "printerCategory": "cozinha",
  "ticketData": {
    "companyName": "Meu Restaurante",
    "orderNumber": "123",
    "origin": "MESA 5",
    "items": [
      {
        "quantity": 2,
        "name": "HAMBURGUER",
        "notes": "Sem cebola"
      }
    ],
    "cut": true,
    "beep": true
  }
}
```

Ou com ESC/POS pré-formatado:

```json
{
  "printerId": "printer-123",
  "rawEscPos": "base64_encoded_escpos_data"
}
```

## Estrutura do ticketData

| Campo | Tipo | Descrição |
|-------|------|-----------|
| companyName | string | Nome da empresa (cabeçalho) |
| orderNumber | string | Número do pedido |
| origin | string | Mesa, delivery, etc. |
| customerName | string | Nome do cliente |
| customerPhone | string | Telefone |
| address | string | Endereço de entrega |
| datetime | string | Data/hora formatada |
| items | array | Lista de itens |
| items[].quantity | number | Quantidade |
| items[].name | string | Nome do item |
| items[].notes | string | Observações |
| items[].addons | array | Adicionais |
| items[].price | number | Preço unitário |
| showPrices | boolean | Exibir preços |
| subtotal | number | Subtotal |
| discount | number | Desconto |
| deliveryFee | number | Taxa de entrega |
| total | number | Total |
| paymentMethod | string | Forma de pagamento |
| change | number | Troco para |
| notes | string | Observações gerais |
| barcode | string | Conteúdo do código de barras |
| footer | string | Texto do rodapé |
| beep | boolean | Tocar beep |
| cut | boolean | Cortar papel |

## Integração com o Sistema Web

No front-end (React), faça chamadas para o endpoint local:

```typescript
// Verifica se o agente está rodando
const isAgentRunning = async () => {
  try {
    const res = await fetch('http://localhost:9898/health');
    return res.ok;
  } catch {
    return false;
  }
};

// Envia impressão
const printTicket = async (ticketData) => {
  const res = await fetch('http://localhost:9898/print', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      printerCategory: 'cozinha',
      ticketData
    })
  });
  return res.json();
};
```

## Fila via Supabase

O agente também monitora a tabela `print_job_queue_v3` via Realtime. Quando um novo job é inserido com `status = 'pending'`, o agente processa automaticamente.

Estrutura do job:

```sql
INSERT INTO print_job_queue_v3 (
  company_id,
  job_type,
  printer_category,
  ticket_data,
  status
) VALUES (
  'uuid-da-empresa',
  'order_ticket',
  'cozinha',
  '{"orderNumber": "123", ...}'::jsonb,
  'pending'
);
```

## Troubleshooting

### Impressora USB não aparece

- Verifique se a impressora está instalada no sistema
- Windows: Compartilhe a impressora (Propriedades > Compartilhamento)
- Linux/Mac: Certifique-se de que o CUPS está configurado

### Impressora de rede não conecta

- Verifique o IP e porta (padrão 9100)
- Teste ping para o IP
- Verifique firewall

### Caracteres estranhos na impressão

- Configure a codepage correta (CP860 para português)
- Algumas impressoras exigem configuração via DIP switches

## Licença

Proprietário - Zoopi Tecnologia
