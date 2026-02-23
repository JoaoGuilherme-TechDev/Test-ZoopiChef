# Zoopi Print Agent - Desktop

Aplicativo Windows executável (.exe) para impressão automática de pedidos.

## Características

- ✅ **Executável standalone** - Não precisa instalar Node.js
- ✅ **Ícone na bandeja** - Roda em background com ícone no system tray
- ✅ **Notificações Windows** - Alertas nativos de impressão
- ✅ **Auto-start** - Opção para iniciar com Windows
- ✅ **Interface web** - Configuração via navegador em localhost:3847
- ✅ **Realtime + Polling** - Monitora fila de impressão em tempo real

## Requisitos para Build

- Node.js 18+ (apenas para compilar)
- Windows 10/11 x64

## Como Compilar

1. Abra o terminal nesta pasta
2. Execute:
   ```batch
   build.bat
   ```
3. O executável será gerado em `dist/ZoopiPrintAgent.exe`

## Como Usar

1. **Execute** `ZoopiPrintAgent.exe` (duplo clique)
2. **Ícone aparece** na bandeja do sistema (próximo ao relógio)
3. **Clique direito** no ícone → "Configurações"
4. **Navegador abre** em `http://localhost:3847`
5. **Configure**:
   - URL do Supabase: `https://ffvznjlnjxajrsgptijk.supabase.co`
   - Chave Anon: (chave do projeto)
   - ID da Empresa: (UUID da sua empresa)
   - Impressora: IP/porta ou nome USB
6. **Clique** "Salvar e Iniciar"
7. **Pronto!** O agente monitora a fila e imprime automaticamente

## Menu do Ícone (Clique Direito)

| Opção | Descrição |
|-------|-----------|
| ▶️/⏹️ Iniciar/Parar | Liga/desliga o monitoramento |
| ⚙️ Configurações | Abre interface web |
| 📊 Estatísticas | Mostra contadores de impressão |
| 🖨️ Imprimir Teste | Envia página de teste |
| ○/✓ Iniciar com Windows | Liga/desliga auto-start |
| ❌ Sair | Fecha o agente |

## Cores do Ícone

| Cor | Significado |
|-----|-------------|
| 🟢 Verde | Agente ativo e monitorando |
| 🟡 Amarelo | Configuração pendente |
| 🔴 Vermelho | Erro ou parado |

## Arquivos de Configuração

A configuração é salva em:
```
%APPDATA%\Zoopi\agent-config.json
```

## Múltiplas Impressoras

O agente suporta configurar impressoras diferentes por setor de produção.

1. **Impressora Principal**: Configure na interface do agente (localhost:3847)
2. **Impressoras por Setor**: Configure no sistema Zoopi em **Configurações → Setores de Impressão**

### Formatos de Nome de Impressora

| Tipo | Formato | Exemplo |
|------|---------|---------|
| USB Local | Nome exato | `EPSON TM-T20` |
| USB em outro PC | `\\NOME-PC\Impressora` | `\\CAIXA01\EPSON TM-T20` |
| Rede TCP/IP | IP:Porta | `192.168.1.100:9100` |

### Impressora Compartilhada em Outro PC

Para usar uma impressora USB conectada em outro computador da rede:

1. No PC onde a impressora está conectada:
   - Vá em **Painel de Controle** → **Dispositivos e Impressoras**
   - Clique com botão direito na impressora → **Propriedades**
   - Aba **Compartilhamento** → Marque **Compartilhar esta impressora**
   - Anote o **Nome do compartilhamento** (ex: `EPSON TM-T20`)

2. No agente, use o formato:
   ```
   \\NOME-PC\Nome-Compartilhamento
   ```
   Exemplo: `\\CAIXA01\EPSON TM-T20`

## Troubleshooting

### Agente não inicia
- Verifique se outra instância não está rodando
- Verifique se a porta 3847 está livre

### Impressora não responde
- Verifique IP/porta da impressora de rede
- Para USB, verifique se o nome está correto

### Impressora compartilhada não funciona
- Verifique se o compartilhamento está ativo no PC de origem
- Verifique se o firewall permite acesso
- Use o nome do PC (não IP) + nome do compartilhamento

### Notificações não aparecem
- Verifique configurações de notificação do Windows

## Estrutura de Arquivos

```
agent-desktop/
├── main.js              # Ponto de entrada
├── agent-core.js        # Lógica de monitoramento
├── config-manager.js    # Gerenciamento de config
├── notification-manager.js # Notificações Windows
├── printer.js           # Funções de impressão
├── startup-manager.js   # Auto-start Windows
├── tray-manager.js      # System tray
├── web-server.js        # Interface web
├── assets/              # Ícones
├── build.bat            # Script de build
└── package.json         # Dependências
```

## Desenvolvimento

Para rodar em modo desenvolvimento (sem compilar):

```bash
npm install
npm start
```

## Licença

Zoopi © 2024
