# Zoopi Print Service

Serviço local para impressão em impressoras térmicas TCP/IP (rede).

## Opções de Uso

### Opção 1: Agente de Impressão (Recomendado)

O agente monitora automaticamente a fila de impressão e imprime os pedidos.

#### Instalação

1. **Instalar Node.js**
   - Baixe em: https://nodejs.org/
   - Instale a versão LTS

2. **Instalar dependências**
   ```bash
   cd print-service
   npm install
   ```

3. **Configurar**
   - Copie `agent-config.example.json` para `agent-config.json`
   - Edite com suas configurações:
   ```json
   {
     "supabaseUrl": "https://seu-projeto.supabase.co",
     "supabaseKey": "sua-anon-key",
     "companyId": "id-da-sua-empresa",
     "printerHost": "192.168.1.100",
     "printerPort": 9100
   }
   ```

4. **Iniciar o agente**
   ```bash
   npm run agent
   ```

#### Executar como Serviço Windows

Para rodar automaticamente ao iniciar o Windows:

```bash
npm install -g pm2
npm install -g pm2-windows-startup

pm2 start agent.js --name zoopi-print-agent
pm2 save
pm2-startup install
```

### Opção 2: Servidor HTTP (API)

Para integrações customizadas via HTTP.

```bash
npm start
```

## Endpoints da API

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/health` | GET | Verifica se o serviço está online |
| `/print` | POST | Imprime texto raw |
| `/print-ticket` | POST | Imprime ticket formatado |
| `/test-connection` | POST | Testa conexão com impressora |

## Configuração no Sistema

Após configurar o agente, acesse no Zoopi:
**Configurações → Impressão → Estação de Impressão**

Para monitorar o status da impressão em tempo real.

## Parâmetros de Configuração

| Parâmetro | Descrição | Padrão |
|-----------|-----------|--------|
| `supabaseUrl` | URL do projeto Supabase | - |
| `supabaseKey` | Chave anon do Supabase | - |
| `companyId` | ID da empresa (filtro) | - |
| `printerType` | Tipo: `network` ou `usb` | network |
| `printerHost` | IP da impressora (rede) | 192.168.1.100 |
| `printerPort` | Porta da impressora (rede) | 9100 |
| `printerName` | Nome da impressora (USB/Windows) | - |
| `pollInterval` | Intervalo de polling (ms) | 3000 |
| `encoding` | Codificação de caracteres | cp860 |
| `beepOnPrint` | Emitir beep ao imprimir | true |
| `cutAfterPrint` | Cortar papel após imprimir | true |
| `copies` | Número de cópias | 1 |

## Configuração USB (Windows)

Para usar uma impressora USB no Windows:

1. **Descobrir o nome exato da impressora**
   - Abra "Painel de Controle" → "Dispositivos e Impressoras"
   - O nome da impressora deve ser exatamente como aparece lá
   - Exemplo: `EPSON TM-T20`, `Generic / Text Only`

2. **Configurar o agent-config.json**
   ```json
   {
     "printerType": "usb",
     "printerName": "EPSON TM-T20"
   }
   ```

3. **Compartilhar a impressora (recomendado)**
   - Clique com botão direito na impressora → Propriedades
   - Aba "Compartilhamento" → Marcar "Compartilhar esta impressora"
   - Isso melhora a compatibilidade com o agente

## Troubleshooting

### Impressora não responde
- Verifique se o IP está correto
- Verifique se a porta 9100 está liberada no firewall
- Teste ping para o IP da impressora

### Caracteres estranhos
- O serviço usa codificação CP860 para português
- Se necessário, altere o parâmetro `encoding`

### Agente não conecta
- Verifique as credenciais do Supabase
- Verifique se o `companyId` está correto
- Verifique logs no console

### Serviço não inicia
- Verifique se a porta 3847 não está em uso
- Execute como Administrador se necessário
