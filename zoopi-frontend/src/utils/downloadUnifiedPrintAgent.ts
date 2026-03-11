import JSZip from 'jszip';

const AGENT_VERSION = '2.1.0';

/**
 * Gera e baixa o Agente Unificado de Impressão v2.1
 * - Lê impressoras do printer_registry
 * - Usa roteamento do printer_job_routing
 * - Suporta todos os tipos de job
 * - Inclui scripts para rodar como serviço Windows (background)
 */
export async function downloadUnifiedPrintAgent(companyId: string) {
  const zip = new JSZip();

  // ===== package.json =====
  zip.file('package.json', JSON.stringify({
    name: 'zoopi-print-agent',
    version: AGENT_VERSION,
    description: 'Agente Unificado de Impressão Zoopi',
    main: 'agent.js',
    scripts: {
      start: 'node agent.js',
      'install-service': 'node install-service.js',
      'uninstall-service': 'node uninstall-service.js'
    },
    dependencies: {
      '@supabase/supabase-js': '^2.39.0',
      'node-windows': '^1.0.0-beta.8'
    }
  }, null, 2));

  // ===== config.json =====
  const configContent = {
    supabaseUrl: 'https://ffvznjlnjxajrsgptijk.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdnpuamxuanhhanJzZ3B0aWprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1ODk5MTgsImV4cCI6MjA4MjE2NTkxOH0.ltVrHo0BYuouzNwYyt4gklOI2PDpKEyMshrmM1HxKNo',
    companyId: companyId,
    // Credenciais opcionais (se RLS exigir autenticação)
    agentEmail: '',
    agentPassword: '',
    // Configuração de polling
    pollInterval: 3000,
  };
  zip.file('config.json', JSON.stringify(configContent, null, 2));

  // ===== agent.js =====
  const agentCode = `/**
 * ZOOPI PRINT AGENT v${AGENT_VERSION}
 * Agente Unificado de Impressão
 * 
 * Funcionalidades:
 * - Lê impressoras cadastradas no painel (printer_registry)
 * - Roteia jobs automaticamente por tipo/setor (printer_job_routing)
 * - Suporta: Pedidos, Mesa, Caixa, Sommelier, etc.
 * - Conexão: Rede (TCP) ou USB/Windows (RAW)
 */

const { createClient } = require('@supabase/supabase-js');
const net = require('net');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// ========== CONFIGURAÇÃO ==========
const configPath = path.join(__dirname, 'config.json');
if (!fs.existsSync(configPath)) {
  console.error('❌ Arquivo config.json não encontrado!');
  console.log('Copie config.example.json para config.json e configure.');
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const supabase = createClient(config.supabaseUrl, config.supabaseKey);

// Cache de impressoras e roteamentos
let printers = [];
let routings = [];
let defaultPrinter = null;

// ========== LOGS ==========
function log(msg, level = 'INFO') {
  const ts = new Date().toLocaleString('pt-BR');
  const prefix = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : '✅';
  console.log(\`[\${ts}] \${prefix} \${msg}\`);
}

// ========== AUTENTICAÇÃO ==========
async function authenticate() {
  if (!config.agentEmail || !config.agentPassword) {
    log('Sem credenciais configuradas, usando modo anônimo');
    return true;
  }
  
  const { error } = await supabase.auth.signInWithPassword({
    email: config.agentEmail,
    password: config.agentPassword,
  });
  
  if (error) {
    log(\`Falha na autenticação: \${error.message}\`, 'ERROR');
    return false;
  }
  
  log('Autenticado com sucesso!');
  return true;
}

// ========== CARREGAR IMPRESSORAS ==========
async function loadPrinters() {
  const { data, error } = await supabase
    .from('printer_registry')
    .select('*')
    .eq('company_id', config.companyId)
    .eq('is_active', true);
  
  if (error) {
    log(\`Erro ao carregar impressoras: \${error.message}\`, 'ERROR');
    return;
  }
  
  printers = data || [];
  defaultPrinter = printers.find(p => p.is_default) || printers[0] || null;
  
  log(\`Carregadas \${printers.length} impressora(s)\`);
  printers.forEach(p => {
    const conn = p.printer_type === 'network' 
      ? \`\${p.printer_host}:\${p.printer_port}\`
      : \`USB: \${p.printer_name}\`;
    log(\`  → \${p.name} (\${conn})\${p.is_default ? ' [PADRÃO]' : ''}\`);
  });
}

// ========== CARREGAR ROTEAMENTOS ==========
async function loadRoutings() {
  const { data, error } = await supabase
    .from('printer_job_routing')
    .select('*')
    .eq('company_id', config.companyId)
    .eq('is_active', true);
  
  if (error) {
    log(\`Erro ao carregar roteamentos: \${error.message}\`, 'ERROR');
    return;
  }
  
  routings = data || [];
  log(\`Carregados \${routings.length} roteamento(s)\`);
}

// ========== ENCONTRAR IMPRESSORA PARA JOB ==========
function findPrinterForJob(job) {
  // 1. Match exato: tipo + setor
  let routing = routings.find(r => 
    r.job_type === job.job_type && 
    r.print_sector_id === job.print_sector_id
  );
  
  // 2. Match por tipo (setor null)
  if (!routing) {
    routing = routings.find(r => 
      r.job_type === job.job_type && 
      r.print_sector_id === null
    );
  }
  
  // 3. Match por setor (tipo null)
  if (!routing && job.print_sector_id) {
    routing = routings.find(r => 
      r.job_type === null && 
      r.print_sector_id === job.print_sector_id
    );
  }
  
  // Se encontrou roteamento, busca a impressora
  if (routing) {
    const printer = printers.find(p => p.id === routing.printer_id);
    if (printer) return printer;
  }
  
  // Fallback: impressora padrão
  return defaultPrinter;
}

// ========== IMPRIMIR VIA REDE ==========
function printNetwork(host, port, data) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    client.setTimeout(10000);
    
    client.connect(port, host, () => {
      client.write(data, (err) => {
        if (err) reject(err);
        else {
          client.end();
          resolve();
        }
      });
    });
    
    client.on('error', reject);
    client.on('timeout', () => {
      client.destroy();
      reject(new Error('Timeout de conexão'));
    });
  });
}

// ========== IMPRIMIR VIA USB/WINDOWS ==========
function printUsb(printerName, data) {
  const tempDir = path.join(os.tmpdir(), 'zoopi-print');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  
  const tempFile = path.join(tempDir, \`job-\${Date.now()}.bin\`);
  fs.writeFileSync(tempFile, data);
  
  try {
    // Método 1: copy /b para compartilhamento
    const hostname = os.hostname();
    const printerPath = \`\\\\\\\\\\\\\\\\$\{hostname}\\\\\\\\$\{printerName}\`;
    
    try {
      execSync(\`copy /b "\${tempFile}" "\${printerPath}"\`, { 
        shell: 'cmd.exe',
        stdio: 'pipe'
      });
      log(\`Impresso via copy /b → \${printerPath}\`);
      fs.unlinkSync(tempFile);
      return;
    } catch (e) {
      log(\`copy /b falhou, tentando PowerShell...\`, 'WARN');
    }
    
    // Método 2: PowerShell Out-Printer
    const latin1Content = data.toString('latin1');
    const ps1File = path.join(tempDir, \`print-\${Date.now()}.ps1\`);
    fs.writeFileSync(ps1File, \`
      [System.IO.File]::ReadAllBytes('\${tempFile.replace(/\\\\/g, '\\\\\\\\')}') | ForEach-Object {
        [char]$_
      } | Out-Printer -Name '\${printerName}'
    \`, 'utf8');
    
    execSync(\`powershell -ExecutionPolicy Bypass -File "\${ps1File}"\`, { stdio: 'pipe' });
    log(\`Impresso via PowerShell → \${printerName}\`);
    
    fs.unlinkSync(tempFile);
    fs.unlinkSync(ps1File);
  } catch (error) {
    fs.unlinkSync(tempFile);
    throw error;
  }
}

// ========== PROCESSAR JOB ==========
async function processJob(job) {
  log(\`Processando job \${job.id} (tipo: \${job.job_type})\`);
  
  // Encontrar impressora
  const printer = findPrinterForJob(job);
  if (!printer) {
    throw new Error('Nenhuma impressora encontrada para este job');
  }
  
  log(\`  → Impressora: \${printer.name}\`);
  
  // Extrair dados para impressão
  let printData;
  const metadata = job.metadata || {};
  
  if (metadata.rawEscPosBase64) {
    printData = Buffer.from(metadata.rawEscPosBase64, 'base64');
  } else if (metadata.rawEscPos) {
    printData = Buffer.from(metadata.rawEscPos, 'binary');
  } else if (metadata.content) {
    // Texto simples → ESC/POS básico
    const text = metadata.content;
    const init = Buffer.from([0x1B, 0x40]); // ESC @
    const content = Buffer.from(text, 'latin1');
    const cut = printer.cut_after_print ? Buffer.from([0x1D, 0x56, 0x00]) : Buffer.alloc(0);
    const beep = printer.beep_on_print ? Buffer.from([0x1B, 0x42, 0x03, 0x02]) : Buffer.alloc(0);
    printData = Buffer.concat([init, beep, content, cut]);
  } else {
    throw new Error('Job sem dados de impressão (metadata.rawEscPosBase64/rawEscPos/content)');
  }
  
  // Imprimir N cópias
  const copies = printer.copies || 1;
  for (let i = 0; i < copies; i++) {
    if (printer.printer_type === 'network') {
      await printNetwork(printer.printer_host, printer.printer_port, printData);
    } else {
      printUsb(printer.printer_name, printData);
    }
    
    if (copies > 1) log(\`  Cópia \${i + 1}/\${copies} impressa\`);
  }
  
  log(\`  ✓ Job \${job.id} concluído\`);
}

// ========== MARCAR JOB COMO COMPLETO ==========
async function markCompleted(jobId) {
  await supabase
    .from('print_job_queue')
    .update({ 
      status: 'completed', 
      printed_at: new Date().toISOString() 
    })
    .eq('id', jobId);
}

// ========== MARCAR JOB COMO FALHO ==========
async function markFailed(jobId, errorMessage) {
  const { data: job } = await supabase
    .from('print_job_queue')
    .select('attempts')
    .eq('id', jobId)
    .single();
  
  const attempts = (job?.attempts || 0) + 1;
  const status = attempts >= 3 ? 'failed' : 'pending';
  
  await supabase
    .from('print_job_queue')
    .update({ 
      status,
      attempts,
      error_message: errorMessage
    })
    .eq('id', jobId);
}

// ========== BUSCAR JOBS PENDENTES ==========
async function fetchPendingJobs() {
  const { data, error } = await supabase
    .from('print_job_queue')
    .select('*')
    .eq('company_id', config.companyId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(10);
  
  if (error) {
    log(\`Erro ao buscar jobs: \${error.message}\`, 'ERROR');
    return [];
  }
  
  return data || [];
}

// ========== LOOP PRINCIPAL ==========
async function mainLoop() {
  const jobs = await fetchPendingJobs();
  
  for (const job of jobs) {
    try {
      await processJob(job);
      await markCompleted(job.id);
    } catch (error) {
      log(\`Erro no job \${job.id}: \${error.message}\`, 'ERROR');
      await markFailed(job.id, error.message);
    }
  }
}

// ========== INICIALIZAÇÃO ==========
async function start() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('   🖨️  ZOOPI PRINT AGENT v${AGENT_VERSION}');
  console.log('   Agente Unificado de Impressão');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  
  log(\`Empresa: \${config.companyId}\`);
  
  // Autenticar
  const authed = await authenticate();
  if (!authed && config.agentEmail) {
    log('Continuando sem autenticação...', 'WARN');
  }
  
  // Carregar configurações
  await loadPrinters();
  await loadRoutings();
  
  if (printers.length === 0) {
    log('ATENÇÃO: Nenhuma impressora cadastrada!', 'WARN');
    log('Cadastre impressoras em: Configurações → Impressoras');
  }
  
  // Subscrição realtime para recarregar config
  supabase
    .channel('printer-config')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'printer_registry', filter: \`company_id=eq.\${config.companyId}\` },
      () => { log('Impressoras atualizadas!'); loadPrinters(); }
    )
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'printer_job_routing', filter: \`company_id=eq.\${config.companyId}\` },
      () => { log('Roteamentos atualizados!'); loadRoutings(); }
    )
    .subscribe();
  
  // Subscrição para novos jobs
  supabase
    .channel('print-jobs')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'print_job_queue', filter: \`company_id=eq.\${config.companyId}\` },
      (payload) => {
        log(\`Novo job recebido: \${payload.new.job_type}\`);
        mainLoop();
      }
    )
    .subscribe();
  
  log('Aguardando jobs de impressão...');
  log(\`Polling a cada \${config.pollInterval / 1000}s\`);
  
  // Processar jobs existentes
  await mainLoop();
  
  // Polling de backup
  setInterval(mainLoop, config.pollInterval);
}

// ========== TRATAMENTO DE ERROS ==========
process.on('uncaughtException', (error) => {
  log(\`Erro fatal: \${error.message}\`, 'ERROR');
});

process.on('unhandledRejection', (error) => {
  log(\`Promise rejeitada: \${error}\`, 'ERROR');
});

// ========== START ==========
start();
`;
  zip.file('agent.js', agentCode);

  // ===== INICIAR.bat =====
  zip.file('INICIAR.bat', `@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo Iniciando Zoopi Print Agent v${AGENT_VERSION}...
echo.
node agent.js
pause
`);

  // ===== install-service.js =====
  zip.file('install-service.js', `/**
 * Instala o Zoopi Print Agent como Serviço Windows
 * Roda em background sem janela cmd
 */
const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'Zoopi Print Agent',
  description: 'Agente de impressão Zoopi - Roda em background',
  script: path.join(__dirname, 'agent.js'),
  nodeOptions: [],
  workingDirectory: __dirname,
});

svc.on('install', () => {
  console.log('');
  console.log('✅ Serviço instalado com sucesso!');
  console.log('');
  console.log('O agente está rodando em BACKGROUND.');
  console.log('Você pode fechar esta janela.');
  console.log('');
  console.log('Para ver o status: services.msc → "Zoopi Print Agent"');
  console.log('Para remover: execute REMOVER-SERVICO.bat');
  console.log('');
  svc.start();
});

svc.on('alreadyinstalled', () => {
  console.log('');
  console.log('⚠️ Serviço já está instalado!');
  console.log('Para reinstalar, primeiro execute REMOVER-SERVICO.bat');
  console.log('');
});

svc.on('error', (err) => {
  console.log('');
  console.log('❌ Erro ao instalar serviço:', err);
  console.log('');
  console.log('Tente executar como ADMINISTRADOR:');
  console.log('  Clique com botão direito em INSTALAR-SERVICO.bat');
  console.log('  Selecione "Executar como administrador"');
  console.log('');
});

console.log('');
console.log('Instalando Zoopi Print Agent como serviço Windows...');
console.log('');
svc.install();
`);

  // ===== uninstall-service.js =====
  zip.file('uninstall-service.js', `/**
 * Remove o Zoopi Print Agent do serviço Windows
 */
const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'Zoopi Print Agent',
  script: path.join(__dirname, 'agent.js'),
});

svc.on('uninstall', () => {
  console.log('');
  console.log('✅ Serviço removido com sucesso!');
  console.log('');
  console.log('O agente NÃO está mais rodando em background.');
  console.log('Para usar novamente, execute INICIAR.bat ou reinstale o serviço.');
  console.log('');
});

svc.on('error', (err) => {
  console.log('');
  console.log('❌ Erro ao remover serviço:', err);
  console.log('');
});

console.log('');
console.log('Removendo Zoopi Print Agent do serviço Windows...');
console.log('');
svc.uninstall();
`);

  // ===== INSTALAR-SERVICO.bat =====
  zip.file('INSTALAR-SERVICO.bat', `@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo ══════════════════════════════════════════════════════════
echo   INSTALANDO ZOOPI PRINT AGENT COMO SERVIÇO WINDOWS
echo ══════════════════════════════════════════════════════════
echo.
echo Isso permite que o agente rode em BACKGROUND (sem janela).
echo.

:: Verificar se node_modules existe
if not exist "node_modules" (
    echo Instalando dependencias...
    call npm install
    echo.
)

:: Instalar serviço (requer admin)
node install-service.js

echo.
pause
`);

  // ===== REMOVER-SERVICO.bat =====
  zip.file('REMOVER-SERVICO.bat', `@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo ══════════════════════════════════════════════════════════
echo   REMOVENDO ZOOPI PRINT AGENT DO SERVIÇO WINDOWS
echo ══════════════════════════════════════════════════════════
echo.

node uninstall-service.js

echo.
pause
`);

  // ===== LEIAME.txt =====
  zip.file('LEIAME.txt', `
╔══════════════════════════════════════════════════════════════════╗
║  ZOOPI PRINT AGENT v${AGENT_VERSION} - Agente Unificado de Impressão  ║
╚══════════════════════════════════════════════════════════════════╝

REQUISITOS:
  • Node.js 20 LTS ou superior
  • Windows 10/11

═══════════════════════════════════════════════════════════════════
  OPÇÃO 1: RODAR MANUALMENTE (janela cmd aberta)
═══════════════════════════════════════════════════════════════════

  1. Extraia esta pasta em local fixo (ex: C:\\Zoopi\\)
  2. Abra terminal e execute: npm install
  3. Execute: INICIAR.bat (ou npm start)
  
  ⚠️ A janela do cmd precisa ficar aberta!

═══════════════════════════════════════════════════════════════════
  OPÇÃO 2: RODAR EM BACKGROUND (recomendado)
═══════════════════════════════════════════════════════════════════

  1. Extraia esta pasta em local fixo (ex: C:\\Zoopi\\)
  2. Clique com botão DIREITO em INSTALAR-SERVICO.bat
  3. Selecione "Executar como administrador"
  4. Pronto! Pode fechar a janela.
  
  ✅ O agente roda automaticamente ao ligar o PC!
  ✅ Não precisa de janela aberta!
  
  Para REMOVER o serviço: execute REMOVER-SERVICO.bat (como admin)
  Para VER o status: Windows+R → services.msc → "Zoopi Print Agent"

═══════════════════════════════════════════════════════════════════
  CONFIGURAÇÃO DAS IMPRESSORAS
═══════════════════════════════════════════════════════════════════

  O agente lê as impressoras AUTOMATICAMENTE do painel!
  
  Vá em: Sistema → Configurações → Impressão → aba Gerenciamento
  - Cadastre suas impressoras (Nome, IP ou USB)
  - Configure o roteamento (qual impressora imprime o quê)
  
  O agente detecta mudanças em tempo real.

═══════════════════════════════════════════════════════════════════
  IMPRESSORA USB/WINDOWS
═══════════════════════════════════════════════════════════════════

  Para USB funcionar, a impressora DEVE estar COMPARTILHADA:
  
  1. Painel de Controle → Dispositivos e Impressoras
  2. Clique com botão direito → Propriedades da impressora
  3. Aba "Compartilhamento" → Marcar "Compartilhar esta impressora"
  4. Use o nome do compartilhamento no cadastro do sistema

═══════════════════════════════════════════════════════════════════
  SUPORTE
═══════════════════════════════════════════════════════════════════

  Em caso de problemas, verifique:
  - A impressora está ligada e online?
  - O IP está correto? (para rede)
  - O nome do compartilhamento está exato? (para USB)
  - Execute INICIAR.bat para ver erros no terminal

`.trim());

  // Gerar e baixar
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zoopi-print-agent-v${AGENT_VERSION}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
