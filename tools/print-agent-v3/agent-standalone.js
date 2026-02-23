/**
 * Zoopi Print Agent v3.0 - Standalone Node.js Version
 * 
 * Agente de Impressão sem Electron (para testes)
 * - Processa jobs da fila Supabase
 * - Envia raw ESC/POS direto para impressora USB
 * 
 * Uso: node agent-standalone.js
 */

const { createClient } = require('@supabase/supabase-js');
const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');

// Carrega configuração
let config;
try {
  config = require('./config.json');
} catch (e) {
  console.error('Erro: config.json não encontrado');
  console.log('Crie um arquivo config.json com:');
  console.log(JSON.stringify({
    supabaseUrl: 'https://xxxx.supabase.co',
    supabaseKey: 'eyJ...',
    companyId: 'uuid-da-empresa',
    printerName: 'Nome-da-Impressora-Windows'
  }, null, 2));
  process.exit(1);
}

const supabase = createClient(config.supabaseUrl, config.supabaseKey);

console.log('========================================');
console.log('  ZOOPI PRINT AGENT v3.0.0 (STANDALONE)');
console.log('========================================');
console.log(`Company: ${config.companyId}`);
console.log(`Impressora: ${config.printerName}`);
console.log('----------------------------------------\n');

// Lista impressoras disponíveis
async function listPrinters() {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      exec('wmic printer get name', { encoding: 'utf8' }, (error, stdout) => {
        if (error) {
          resolve([]);
          return;
        }
        const printers = stdout
          .split('\n')
          .slice(1)
          .map(line => line.trim())
          .filter(line => line.length > 0);
        resolve(printers);
      });
    } else {
      exec('lpstat -a', (error, stdout) => {
        if (error) {
          resolve([]);
          return;
        }
        const printers = stdout
          .split('\n')
          .map(line => line.split(' ')[0])
          .filter(name => name.length > 0);
        resolve(printers);
      });
    }
  });
}

// Envia dados para impressora USB via Windows
async function printRaw(printerName, data) {
  const tempFile = path.join(os.tmpdir(), `zoopi-print-${Date.now()}.bin`);
  
  try {
    fs.writeFileSync(tempFile, data);

    if (process.platform === 'win32') {
      // Tenta diferentes caminhos
      const paths = [
        `\\\\localhost\\${printerName}`,
        `\\\\${os.hostname()}\\${printerName}`,
        `\\\\127.0.0.1\\${printerName}`
      ];

      for (const printerPath of paths) {
        try {
          execSync(`copy /b "${tempFile}" "${printerPath}"`, {
            encoding: 'utf8',
            timeout: 10000,
            windowsHide: true
          });
          console.log(`   ✅ Enviado para ${printerPath}`);
          return;
        } catch (e) {
          // Tentar próximo
        }
      }

      throw new Error(`Não foi possível enviar para "${printerName}"`);
    } else {
      execSync(`lpr -P "${printerName}" -o raw "${tempFile}"`, {
        encoding: 'utf8',
        timeout: 10000
      });
    }
  } finally {
    try { fs.unlinkSync(tempFile); } catch (e) { /* ignore */ }
  }
}

// Envia para impressora de rede
async function printNetwork(host, port, data) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    const timeout = setTimeout(() => {
      client.destroy();
      reject(new Error('Timeout'));
    }, 5000);

    client.connect(port, host, () => {
      clearTimeout(timeout);
      client.write(data, () => {
        client.end();
        resolve();
      });
    });

    client.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// Processa um job
async function processJob(job) {
  const shortId = job.id.substring(0, 8);
  console.log(`📄 Job: ${shortId} | Tipo: ${job.job_type}`);

  try {
    // Marca como processando
    await supabase
      .from('print_job_queue_v3')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', job.id);

    const metadata = job.metadata || {};
    let printBuffer;

    // Prioridade 1: raw_escpos
    if (job.raw_escpos) {
      console.log(`   -> RAW ESC/POS: ${job.raw_escpos.length} bytes`);
      printBuffer = Buffer.from(job.raw_escpos, 'base64');
    }
    // Prioridade 2: metadata.rawEscPosBase64
    else if (metadata.rawEscPosBase64) {
      console.log(`   -> Metadata rawEscPosBase64`);
      printBuffer = Buffer.from(metadata.rawEscPosBase64, 'base64');
    }
    else {
      throw new Error('Job sem raw_escpos nem rawEscPosBase64');
    }

    // Determina impressora
    const printerName = metadata.printerName || config.printerName;
    console.log(`   -> Impressora: "${printerName}"`);

    // Envia
    if (metadata.printMode === 'network' && metadata.printerIp) {
      await printNetwork(metadata.printerIp, metadata.printerPort || 9100, printBuffer);
    } else {
      await printRaw(printerName, printBuffer);
    }

    // Marca como concluído
    await supabase
      .from('print_job_queue_v3')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', job.id);

    console.log(`   ✅ Impressão concluída\n`);

  } catch (e) {
    console.error(`   ❌ Erro: ${e.message}\n`);
    await supabase
      .from('print_job_queue_v3')
      .update({ status: 'failed', error_message: e.message })
      .eq('id', job.id);
  }
}

// Loop principal
async function main() {
  // Lista impressoras
  const printers = await listPrinters();
  console.log(`${printers.length} impressora(s) disponíveis:`);
  printers.forEach((p, i) => console.log(`   [${i}] "${p}"`));
  console.log('');

  console.log('🚀 Agente iniciado! Monitorando fila...\n');

  // Poll a cada 3 segundos
  setInterval(async () => {
    try {
      const { data: jobs, error } = await supabase
        .from('print_job_queue_v3')
        .select('*')
        .eq('company_id', config.companyId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(10);

      if (error) {
        console.error('[Poll] Erro:', error.message);
        return;
      }

      if (jobs && jobs.length > 0) {
        console.log(`🔍 ${jobs.length} job(s) pendente(s)\n`);
        for (const job of jobs) {
          await processJob(job);
        }
      }
    } catch (e) {
      console.error('[Poll] Exception:', e.message);
    }
  }, 3000);
}

main().catch(console.error);
