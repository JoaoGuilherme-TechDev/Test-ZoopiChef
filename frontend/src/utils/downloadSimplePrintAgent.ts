/**
 * Download do Zoopi Simple Print Agent
 * 
 * Agente simplificado que roda direto no Node.js sem precisar compilar EXE.
 */

import JSZip from "jszip";

function triggerBrowserDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadSimplePrintAgent(
  companyId: string,
  supabaseUrl: string,
  supabaseKey: string
) {
  const zip = new JSZip();
  const agentVersion = "1.2.0";

  // package.json
  const packageJson = JSON.stringify({
    name: "zoopi-simple-print-agent",
    version: agentVersion,
    description: "Agente de impressão simples para USB/Windows",
    main: "agent.js",
    scripts: {
      start: "node agent.js"
    },
    engines: {
      node: ">=20.0.0"
    },
    dependencies: {
      "@supabase/supabase-js": "^2.49.1",
      "iconv-lite": "^0.6.3"
    }
  }, null, 2);

  // config.json (já preenchido com dados da empresa)
  const configJson = JSON.stringify({
    supabaseUrl: supabaseUrl,
    supabaseKey: supabaseKey,
    companyId: companyId,
    printerName: "Server",
    encoding: "cp860"
  }, null, 2);

  // config.example.json (modelo para referência)
  const configExampleJson = JSON.stringify({
    supabaseUrl: "COLE_A_URL_DO_BACKEND_AQUI",
    supabaseKey: "COLE_A_CHAVE_PUBLICAVEL_AQUI",
    companyId: "COLE_SEU_COMPANY_ID_AQUI",
    printerName: "Server",
    encoding: "cp860"
  }, null, 2);

  // agent.js
  const agentJs = `/**
  * Zoopi Simple Print Agent v1.2.0
 * 
 * Agente de impressão simplificado para Windows USB.
 * REQUER Node.js 20+ (LTS)
 * 
 * USO:
 *   1. Verifique o config.json (printerName deve ser o nome exato da impressora)
 *   2. npm install
 *   3. npm start
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const iconv = require('iconv-lite');
const { createClient } = require('@supabase/supabase-js');

// ==================== CONFIG ====================
const CONFIG_FILE = path.join(__dirname, 'config.json');

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    console.error('❌ Arquivo config.json não encontrado!');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

const config = loadConfig();
const supabase = createClient(config.supabaseUrl, config.supabaseKey);

// ==================== ESC/POS ====================
const ESC = '\\x1B';
const GS = '\\x1D';
const CMD = {
  INIT: ESC + '@',
  CUT: GS + 'V\\x00',
  BEEP: ESC + 'B\\x05\\x02',
  BOLD_ON: ESC + 'E\\x01',
  BOLD_OFF: ESC + 'E\\x00',
  DOUBLE_ON: GS + '!\\x30',
  NORMAL: GS + '!\\x00',
  CENTER: ESC + 'a\\x01',
  LEFT: ESC + 'a\\x00',
};

// ==================== IMPRESSÃO USB (BYTES RAW) ====================
// IMPORTANTE: Out-Printer NÃO funciona para ESC/POS!
// O driver de impressão Windows interpreta como texto e renderiza.
// Para enviar bytes RAW (ESC/POS), devemos usar:
//   1. copy /b para impressora compartilhada (envia bytes direto)
//   2. ou gravação direta na porta (COM/LPT)
async function printRawBytes(buffer) {
  const printerName = config.printerName || 'Server';
  const tempFile = path.join(os.tmpdir(), \`zoopi-raw-\${Date.now()}.prn\`);

  try {
    fs.writeFileSync(tempFile, buffer);
    console.log(\`   Impressora: "\${printerName}" (\${buffer.length} bytes RAW)\`);

    // Método 1: copy /b para impressora compartilhada (PRIORIDADE para RAW)
    // A impressora DEVE estar compartilhada no Windows para funcionar!
    console.log('   -> Tentando copy /b (modo RAW)...');
    const hostname = os.hostname();
    const printerPath = \`\\\\\\\\\${hostname}\\\\\${printerName}\`;
    try {
      execSync(\`copy /b "\${tempFile}" "\${printerPath}"\`, { 
        timeout: 20000, 
        shell: 'cmd.exe',
        stdio: 'pipe'
      });
      console.log('   ✓ copy /b OK (bytes enviados direto)');
      return { success: true };
    } catch (copyErr) {
      console.log(\`   ⚠️ copy /b falhou: \${copyErr.message}\`);
      console.log('      Verifique se a impressora está COMPARTILHADA no Windows!');
    }

    // Método 2: print /D: (pode funcionar em alguns casos)
    console.log('   -> Tentando print /D:...');
    try {
      execSync(\`print /D:"\${printerName}" "\${tempFile}"\`, { 
        timeout: 20000, 
        shell: 'cmd.exe',
        stdio: 'pipe'
      });
      console.log('   ✓ print /D: OK');
      return { success: true };
    } catch (printErr) {
      console.log(\`   ⚠️ print /D: falhou: \${printErr.message}\`);
    }

    // Método 3: Tentar via porta direta (LPT1, COM1, etc.)
    const directPorts = ['LPT1', 'LPT2', 'COM1', 'COM2', 'USB001'];
    for (const port of directPorts) {
      console.log(\`   -> Tentando porta direta \${port}...\`);
      try {
        execSync(\`copy /b "\${tempFile}" \${port}\`, { 
          timeout: 10000, 
          shell: 'cmd.exe',
          stdio: 'pipe'
        });
        console.log(\`   ✓ Porta \${port} OK\`);
        return { success: true };
      } catch (portErr) {
        // Silently continue to next port
      }
    }

    // NÃO usar Out-Printer para bytes RAW - ele converte para texto!
    console.log('');
    console.log('   ⚠️  IMPORTANTE: Para ESC/POS funcionar, a impressora');
    console.log('      PRECISA estar COMPARTILHADA no Windows!');
    console.log('      Vá em: Painel de Controle > Impressoras');
    console.log('      Clique direito > Propriedades > Compartilhamento');
    console.log('      Marque "Compartilhar esta impressora"');
    console.log('');

    return { success: false, error: 'Impressora não está compartilhada. Veja instruções acima.' };

  } finally {
    setTimeout(() => {
      try { fs.unlinkSync(tempFile); } catch (e) {}
    }, 2000);
  }
}

// ==================== IMPRESSÃO USB (TEXTO com ESC/POS) ====================
// Também usa copy /b como prioridade para garantir que comandos ESC/POS funcionem
async function printToUsb(content) {
  const printerName = config.printerName || 'Server';
  const tempFile = path.join(os.tmpdir(), \`zoopi-print-\${Date.now()}.prn\`);

  try {
    let data = CMD.INIT + CMD.BEEP + content + '\\n\\n\\n\\n' + CMD.CUT;
    const encoded = iconv.encode(data, config.encoding || 'cp860');
    fs.writeFileSync(tempFile, encoded);

    console.log(\`   Impressora: "\${printerName}" (\${encoded.length} bytes)\`);

    // Método 1: copy /b para impressora compartilhada (PRIORIDADE!)
    console.log('   -> Tentando copy /b (modo RAW)...');
    const hostname = os.hostname();
    const printerPath = \`\\\\\\\\\${hostname}\\\\\${printerName}\`;
    try {
      execSync(\`copy /b "\${tempFile}" "\${printerPath}"\`, { 
        timeout: 20000, 
        shell: 'cmd.exe',
        stdio: 'pipe'
      });
      console.log('   ✓ copy /b OK');
      return { success: true };
    } catch (copyErr) {
      console.log(\`   ⚠️ copy /b falhou: \${copyErr.message}\`);
    }

    // Método 2: print /D:
    console.log('   -> Tentando print /D:...');
    try {
      execSync(\`print /D:"\${printerName}" "\${tempFile}"\`, { 
        timeout: 20000, 
        shell: 'cmd.exe',
        stdio: 'pipe'
      });
      console.log('   ✓ print /D: OK');
      return { success: true };
    } catch (printErr) {
      console.log(\`   ⚠️ print /D: falhou: \${printErr.message}\`);
    }

    // Método 3: Tentar portas diretas
    const directPorts = ['LPT1', 'LPT2', 'COM1', 'USB001'];
    for (const port of directPorts) {
      try {
        execSync(\`copy /b "\${tempFile}" \${port}\`, { 
          timeout: 10000, 
          shell: 'cmd.exe',
          stdio: 'pipe'
        });
        console.log(\`   ✓ Porta \${port} OK\`);
        return { success: true };
      } catch (portErr) {
        // Silently continue
      }
    }

    console.log('');
    console.log('   ⚠️  A impressora precisa estar COMPARTILHADA!');
    console.log('      Painel de Controle > Impressoras > Propriedades');
    console.log('      Aba Compartilhamento > Marque "Compartilhar"');
    console.log('');

    return { success: false, error: 'Impressora não está compartilhada' };

  } finally {
    setTimeout(() => {
      try { fs.unlinkSync(tempFile); } catch (e) {}
    }, 2000);
  }
}

// ==================== FORMATAR PEDIDO ====================
function formatOrder(order) {
  const sep = '-'.repeat(42);
  const sepDouble = '='.repeat(42);
  let txt = '';

  txt += CMD.CENTER + CMD.DOUBLE_ON;
  txt += \`PEDIDO #\${String(order.order_number || '').padStart(3, '0')}\\n\`;
  txt += CMD.NORMAL + CMD.LEFT;
  txt += sepDouble + '\\n';

  const tipo = order.order_type === 'dine_in' ? 'MESA' : 
               order.order_type === 'delivery' ? 'DELIVERY' : 
               order.order_type === 'takeout' ? 'BALCAO' : 'PEDIDO';
  txt += \`Tipo: \${tipo}\\n\`;

  if (order.table_number) {
    txt += \`Mesa: \${order.table_number}\\n\`;
  }

  txt += \`Data: \${new Date(order.created_at).toLocaleString('pt-BR')}\\n\`;
  txt += sep + '\\n';

  const items = order.items || [];
  items.forEach(item => {
    const qty = item.quantity || 1;
    const name = (item.product_name || item.name || 'Item').substring(0, 25);
    const price = ((item.unit_price || 0) * qty / 100).toFixed(2);
    txt += \`\${qty}x \${name.padEnd(26)} R$\${price.padStart(7)}\\n\`;
    if (item.notes) {
      txt += \`   OBS: \${item.notes}\\n\`;
    }
  });

  txt += sep + '\\n';
  const total = (order.total_cents || 0) / 100;
  txt += CMD.BOLD_ON;
  txt += \`TOTAL: R$ \${total.toFixed(2)}\\n\`;
  txt += CMD.BOLD_OFF;

  if (order.customer_name) {
    txt += sep + '\\n';
    txt += \`Cliente: \${order.customer_name}\\n\`;
    if (order.customer_phone) txt += \`Tel: \${order.customer_phone}\\n\`;
  }

  txt += sepDouble + '\\n';
  txt += CMD.CENTER;
  txt += 'Obrigado pela preferencia!\\n';
  txt += CMD.LEFT;

  return txt;
}

// ==================== FORMATAR TESTE ====================
function formatTestPage() {
  const sep = '-'.repeat(42);
  let txt = '';
  txt += CMD.CENTER + CMD.DOUBLE_ON;
  txt += '=== TESTE ===\\n';
  txt += CMD.NORMAL + CMD.LEFT;
  txt += sep + '\\n';
  txt += 'Zoopi Simple Print Agent\\n';
   txt += 'Versao 1.1.0\\n\\n';
  txt += \`Impressora: \${config.printerName}\\n\`;
  txt += \`Codificacao: \${config.encoding}\\n\`;
  txt += \`Data: \${new Date().toLocaleString('pt-BR')}\\n\\n\`;
  txt += 'Caracteres especiais:\\n';
  txt += 'aeiouAEIOU\\n';
  txt += 'cCaoAOaeiouAEIOU\\n';
  txt += sep + '\\n';
  txt += CMD.CENTER;
  txt += 'Impressao OK!\\n';
  txt += CMD.LEFT;
  return txt;
}

// ==================== PROCESSAR JOB ====================
const processedJobs = new Set();

async function processJob(job) {
  if (processedJobs.has(job.id)) return;
  processedJobs.add(job.id);

  console.log(\`\\n📄 Job \${job.id.slice(0,8)} - Tipo: \${job.job_type}\`);

  try {
    const metadata = job.metadata || {};
    let rawBytes = null;
    let content = '';

    // ========== PRIORIDADE 1: ESC/POS RAW em Base64 (table_bill, sommelier, etc) ==========
    if (metadata.rawEscPosBase64) {
      console.log('   -> Usando rawEscPosBase64 (ESC/POS direto)');
      rawBytes = Buffer.from(metadata.rawEscPosBase64, 'base64');
    }
    // ========== PRIORIDADE 2: ESC/POS RAW string ==========
    else if (metadata.rawEscPos) {
      console.log('   -> Usando rawEscPos (string ESC/POS)');
      content = metadata.rawEscPos;
    }
    // ========== PRIORIDADE 3: Texto simples ==========
    else if (metadata.rawText) {
      console.log('   -> Usando rawText');
      content = metadata.rawText;
    }
    // ========== PRIORIDADE 4: Teste de impressora ==========
    else if (job.job_type === 'printer_test') {
      console.log('   -> Gerando página de teste');
      content = formatTestPage();
    }
    // ========== PRIORIDADE 5: Buscar pedido do banco ==========
    else if (job.order_id) {
      console.log('   -> Buscando pedido do banco...');
      const { data: order } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('id', job.order_id)
        .single();

      if (!order) {
        throw new Error('Pedido não encontrado');
      }
      content = formatOrder(order);
    }
    else {
      throw new Error('Job sem conteúdo para imprimir (sem rawEscPosBase64, rawEscPos, rawText ou order_id)');
    }

    // Imprimir - bytes raw ou texto formatado
    const result = rawBytes 
      ? await printRawBytes(rawBytes) 
      : await printToUsb(content);

    if (result.success) {
      await supabase
        .from('print_job_queue')
        .update({ 
          status: 'completed', 
          printed_at: new Date().toISOString() 
        })
        .eq('id', job.id);
      console.log('   ✅ Job concluído');
    } else {
      throw new Error(result.error || 'Falha na impressão');
    }

  } catch (err) {
    console.error(\`   ❌ Erro: \${err.message}\`);
    await supabase
      .from('print_job_queue')
      .update({ 
        status: 'failed', 
        error_message: err.message 
      })
      .eq('id', job.id);
  }
}

// ==================== POLLING ====================
async function checkQueue() {
  try {
    const { data: jobs, error } = await supabase
      .from('print_job_queue')
      .select('*')
      .eq('company_id', config.companyId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Erro ao buscar fila:', error.message);
      return;
    }

    for (const job of (jobs || [])) {
      await processJob(job);
    }
  } catch (err) {
    console.error('Erro no polling:', err.message);
  }
}

// ==================== REALTIME ====================
function setupRealtime() {
  const channel = supabase
    .channel('print-jobs')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'print_job_queue',
        filter: \`company_id=eq.\${config.companyId}\`,
      },
      (payload) => {
        console.log('\\n🔔 Novo job recebido via realtime');
        if (payload.new && payload.new.status === 'pending') {
          processJob(payload.new);
        }
      }
    )
    .subscribe((status) => {
      console.log(\`Realtime: \${status}\`);
    });

  return channel;
}

// ==================== MAIN ====================
async function main() {
  console.log('');
console.log('╔════════════════════════════════════════════╗');
 console.log('║   ZOOPI SIMPLE PRINT AGENT v1.2.0          ║');
  console.log('╠════════════════════════════════════════════╣');
  console.log(\`║  Impressora: \${(config.printerName || 'Server').padEnd(20)}       ║\`);
  console.log('╚════════════════════════════════════════════╝');
  console.log('');

  setupRealtime();
  setInterval(checkQueue, 5000);
  await checkQueue();

  console.log('✓ Agente iniciado. Aguardando jobs...');
  console.log('  (Ctrl+C para encerrar)\\n');
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
`;

  // INICIAR.bat
  const iniciarBat = `@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo Iniciando Zoopi Simple Print Agent...
echo.
node agent.js
pause
`;

  // LEIAME.txt
  const leiame = `╔════════════════════════════════════════════════════════════════╗
 ║         ZOOPI SIMPLE PRINT AGENT v1.2.0                        ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Agente de impressão simplificado para Windows USB.            ║
║  SEM COMPILAR EXE. Só roda e funciona.                         ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║  PRE-REQUISITOS:                                               ║
║                                                                ║
║  1. Node.js 20 LTS ou superior (OBRIGATORIO)                   ║
║     Download: https://nodejs.org/                              ║
║                                                                ║
║  2. IMPRESSORA COMPARTILHADA NO WINDOWS (IMPORTANTE!)          ║
║     - Painel de Controle > Dispositivos e Impressoras          ║
║     - Clique direito na impressora > Propriedades              ║
║     - Aba "Compartilhamento" > Marcar "Compartilhar"           ║
║     - Use o nome compartilhado (ex: "Server") no config.json   ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║  COMO USAR:                                                    ║
║                                                                ║
║  1. Verifique o config.json:                                   ║
║     - printerName: nome EXATO da impressora compartilhada      ║
║                                                                ║
║  2. Abra o CMD nesta pasta e execute:                          ║
║                                                                ║
║       npm install                                              ║
║       npm start                                                ║
║                                                                ║
║     OU dê duplo clique em INICIAR.bat                          ║
║                                                                ║
║  3. Pronto! O agente vai imprimir automaticamente.             ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║  PROBLEMA: Impressão sai com símbolos estranhos (quadrados)?   ║
║                                                                ║
║  A impressora PRECISA estar COMPARTILHADA para que comandos    ║
║  ESC/POS funcionem corretamente. Vá nas propriedades da        ║
║  impressora e ative o compartilhamento!                        ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║  TESTAR IMPRESSORA:                                            ║
║                                                                ║
║  No Zoopi, vá em Configurações > Impressão > Setores           ║
║  e clique em "Testar" em qualquer setor USB.                   ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║  RODAR NO BOOT DO WINDOWS:                                     ║
║                                                                ║
║  Crie um atalho para INICIAR.bat na pasta Startup:             ║
║  C:\\Users\\SEU_USUARIO\\AppData\\Roaming\\Microsoft\\Windows\\      ║
║  Start Menu\\Programs\\Startup                                   ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
`;

  // Adiciona arquivos ao ZIP
  zip.file("package.json", packageJson);
  zip.file("config.json", configJson);
  zip.file("config.example.json", configExampleJson);
  zip.file("agent.js", agentJs);
  zip.file("INICIAR.bat", iniciarBat.replace(/\n/g, "\r\n"));
  zip.file("LEIAME.txt", leiame);

  const blob = await zip.generateAsync({ type: "blob" });
  triggerBrowserDownload(`zoopi-simple-print-agent-v${agentVersion}.zip`, blob);
}
