/**
 * Funções de Impressão
 * Suporta impressoras de rede (TCP/IP) e USB (Windows)
 */

const net = require('net');
const iconv = require('iconv-lite');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const { getConfig } = require('./config-manager');

// ESC/POS ASCII helpers (prevents NBSP/UTF-8 issues like "R$¬ã")
let escposFmt = null;
function getEscposFmt() {
  if (escposFmt) return escposFmt;
  // lazy require to avoid circular deps
  escposFmt = require('./escpos-format');
  return escposFmt;
}

function normalizeForEscpos(content) {
  const { killNbsp } = getEscposFmt();
  return killNbsp(String(content || ''));
}

function resolveEscposEncoding(cfg) {
  const enc = String(cfg?.encoding || '').trim().toLowerCase();
  // UTF-8 is PROIBIDO para ESC/POS (gera bytes multi-byte e quebra codepage)
  if (!enc || enc === 'utf8' || enc === 'utf-8') return 'latin1';
  // "ascii" quebra acentos e vira '?' no papel. Trate como codepage PT-BR.
  if (enc === 'ascii') return 'cp860';
  return enc;
}

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';
const COMMANDS = {
  INIT: ESC + '@',
  CUT: GS + 'V' + '\x00',
  BEEP: ESC + 'B' + '\x05' + '\x02',
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  // Font size (GS !)
  DOUBLE_HEIGHT_ON: GS + '!' + '\x10',
  DOUBLE_HEIGHT_OFF: GS + '!' + '\x00', // Reset size
  DOUBLE_WIDTH_ON: GS + '!' + '\x20',
  DOUBLE_ON: GS + '!' + '\x30',
  NORMAL: GS + '!' + '\x00',
  // Reverse (invert)
  INVERT_ON: GS + 'B' + '\x01',
  INVERT_OFF: GS + 'B' + '\x00',
  // Alignment
  ALIGN_CENTER: ESC + 'a' + '\x01',
  ALIGN_LEFT: ESC + 'a' + '\x00',
  ALIGN_RIGHT: ESC + 'a' + '\x02',
  LINE_FEED: '\n',
};

/**
 * Lista impressoras USB do Windows
 */
async function listWindowsPrinters() {
  return new Promise((resolve) => {
    if (os.platform() !== 'win32') {
      resolve([]);
      return;
    }
    
    exec('wmic printer get name', { encoding: 'utf8' }, (error, stdout) => {
      if (error) {
        resolve([]);
        return;
      }
      
      const printers = stdout
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && line !== 'Name');
      
      resolve(printers);
    });
  });
}

/**
 * Testa conexão com impressora de rede
 */
async function testNetworkPrinter(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(3000);
    
    socket.connect(port || 9100, host, () => {
      socket.destroy();
      resolve({ success: true });
    });
    
    socket.on('error', (err) => {
      socket.destroy();
      resolve({ success: false, error: err.message });
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ success: false, error: 'Timeout - impressora não responde' });
    });
  });
}

/**
 * Testa impressora USB
 */
async function testUsbPrinter(printerName) {
  const printers = await listWindowsPrinters();
  const found = printers.some(p => p.toLowerCase() === printerName.toLowerCase());
  
  if (found) {
    return { success: true };
  }
  return { success: false, error: `Impressora "${printerName}" não encontrada` };
}

/**
 * Imprime em impressora de rede (TCP/IP)
 */
async function printToNetwork(content, options = {}) {
  const config = getConfig();
  const { copies = 1, cut = true, beep = true } = options;

  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.setTimeout(10000);

    // IMPORTANTE: quando o job vem de um setor específico, ele pode trazer host/port.
    // Se ignorarmos isso e usarmos apenas o host global, o agente tenta imprimir no IP errado e dá timeout.
    const targetHost = options.host || config.printerHost;
    const targetPort = options.port || config.printerPort || 9100;

    socket.connect(targetPort, targetHost, () => {
      try {
        const { INIT_BYTES, RESET_STYLE_BYTES } = getEscposFmt();
        const encoding = resolveEscposEncoding(config);
        const normalized = normalizeForEscpos(content);

        // Sempre inicia com reset (bytes)
        socket.write(INIT_BYTES);

        if (beep && config.beepOnPrint) {
          socket.write(Buffer.from(COMMANDS.BEEP, 'binary'));
        }

        for (let i = 0; i < copies; i++) {
          // Reset estilo antes de cada cópia (evita herança tipo "TOTAL estourado")
          socket.write(RESET_STYLE_BYTES);

          // Encode em 1 byte (latin1/cpXXX). NUNCA UTF-8.
          const encoded = iconv.encode(normalized, encoding);
          socket.write(encoded);

          // Sempre finaliza com reset (evita "letras explodindo" em jobs seguintes)
          socket.write(Buffer.from(COMMANDS.BOLD_OFF, 'binary'));
          socket.write(Buffer.from(COMMANDS.INVERT_OFF, 'binary'));
          socket.write(Buffer.from(COMMANDS.NORMAL, 'binary'));

          if (cut && config.cutAfterPrint) {
            socket.write(Buffer.from('\n\n\n\n', 'ascii'));
            socket.write(Buffer.from(COMMANDS.CUT, 'binary'));
          }
        }

        socket.end();
        resolve({ success: true });
      } catch (error) {
        socket.destroy();
        reject(error);
      }
    });

    socket.on('error', reject);
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Timeout na impressão'));
    });
  });
}

/**
 * Imprime em impressora USB (Windows)
 * @param {string} content - Conteúdo a imprimir
 * @param {object} options - Opções de impressão
 * @param {string} options.printerName - Nome da impressora (opcional, usa config se não informado)
 */
async function printToUsb(content, options = {}) {
  const config = getConfig();
  const { copies = 1, cut = true, beep = true, printerName } = options;
  
  // Usa a impressora do setor se informada, senão usa a global
  const targetPrinter = printerName || config.printerName;
  
  if (!targetPrinter) {
    return Promise.reject(new Error('Nome da impressora não configurado'));
  }

  return new Promise((resolve, reject) => {
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `zoopi-print-${Date.now()}.prn`);

    const cleanupTemp = () => {
      try { fs.unlinkSync(tempFile); } catch (e) {}
    };

    try {
      const { INIT_STR, RESET_STYLE_STR } = getEscposFmt();
      const encoding = resolveEscposEncoding(config);
      const normalized = normalizeForEscpos(content);

      let printData = INIT_STR;

      if (beep && config.beepOnPrint) {
        printData += COMMANDS.BEEP;
      }

      for (let i = 0; i < copies; i++) {
        // Reset estilo antes de cada cópia
        printData += RESET_STYLE_STR;
        printData += normalized;

        // Sempre finaliza com reset
        printData += COMMANDS.BOLD_OFF;
        printData += COMMANDS.INVERT_OFF;
        printData += COMMANDS.NORMAL;

        if (cut && config.cutAfterPrint) {
          printData += '\n\n\n\n';
          printData += COMMANDS.CUT;
        }
      }

      // Encode em 1 byte. NUNCA UTF-8.
      const encoded = iconv.encode(printData, encoding);
      fs.writeFileSync(tempFile, encoded);

      console.log(`   Impressora USB: "${targetPrinter}"`);
      
      // Método 1 (principal): PowerShell Out-Printer
      // Importante: Out-Printer lida melhor com TEXTO.
      // Convertemos os bytes do .prn para Latin1 (mapeamento 1:1), preservando ESC/POS.
      const safeTempPath = tempFile.replace(/'/g, "''");
      const safePrinter = targetPrinter.replace(/'/g, "''");
      const psCmd = `powershell -NoProfile -Command "$p='${safeTempPath}'; $bytes=[System.IO.File]::ReadAllBytes($p); $enc=[System.Text.Encoding]::GetEncoding(28591); $txt=$enc.GetString($bytes); $txt | Out-Printer -Name '${safePrinter}'"`;

      console.log('   -> Tentando PowerShell Out-Printer...');

      exec(psCmd, { timeout: 15000 }, (psError, psStdout, psStderr) => {
        if (!psError) {
          console.log('   ✓ PowerShell OK');
          cleanupTemp();
          resolve({ success: true });
          return;
        }

        console.log(`   ⚠️ PowerShell falhou: ${psError.message}`);
        if (psStderr) console.log(`   ⚠️ PowerShell stderr: ${String(psStderr).trim()}`);

        // Método 2: print /D: (alguns ambientes aceitam)
        const printCmd = `print /D:"${targetPrinter}" "${tempFile}"`;

        console.log('   -> Tentando print /D: ...');

        exec(printCmd, { timeout: 15000, shell: 'cmd.exe' }, (printError, stdout, stderr) => {
          if (!printError) {
            console.log('   ✓ print /D: OK');
            cleanupTemp();
            resolve({ success: true });
            return;
          }

          console.log(`   ⚠️ print /D: falhou: ${printError.message}`);
          if (stderr) console.log(`   ⚠️ print /D: stderr: ${String(stderr).trim()}`);

          // Método 3: Copy para compartilhamento local
          const hostname = os.hostname();
          const printerPath = `\\${hostname}\\${targetPrinter}`;

          console.log(`   -> Tentando copy /b para ${printerPath} ...`);

          exec(`copy /b "${tempFile}" "${printerPath}"`, { timeout: 15000, shell: 'cmd.exe' }, (copyError) => {
            if (copyError) {
              cleanupTemp();
              reject(new Error(`Falha ao imprimir via USB: "${targetPrinter}" - Verifique se a impressora está compartilhada.`));
            } else {
              console.log('   ✓ copy /b OK');
              cleanupTemp();
              resolve({ success: true });
            }
          });
        });
      });

    } catch (error) {
      cleanupTemp();
      reject(error);
    }
  });
}

/**
 * Imprime conteúdo usando a impressora configurada
 * @param {string} content - Conteúdo a imprimir
 * @param {object} options - Opções de impressão
 * @param {string} options.printerName - Nome da impressora USB (para setor específico)
 * @param {string} options.printerHost - IP da impressora de rede (para setor específico)
 * @param {number} options.printerPort - Porta da impressora de rede
 * @param {string} options.printMode - Modo: 'usb', 'network', 'windows'
 */
async function printContent(content, options = {}) {
  const config = getConfig();
  
  // Determina o modo de impressão: usa o do setor se informado, senão usa o global
  const printMode = options.printMode || config.printerType;
  
  if (printMode === 'usb' || printMode === 'windows') {
    return printToUsb(content, options);
  }
  
  // Rede - usa IP/porta do setor se informado
  if (options.printerHost) {
    return printToNetwork(content, { 
      ...options, 
      host: options.printerHost, 
      port: options.printerPort || 9100 
    });
  }
  
  return printToNetwork(content, options);
}

/**
 * Imprime uma página de teste
 * Inclui teste obrigatório: "TESTE: R$ 736,00"
 */
async function printTestPage() {
  const config = getConfig();
  
  // Importar módulo de formatação
  const { INIT_STR, RESET_STYLE_STR, moneyBR, sanitize, formatLine, LINE_WIDTH } = require('./escpos-format');
  
  let content = '';
  content += INIT_STR; // Reset completo obrigatório
  content += COMMANDS.ALIGN_CENTER;
  content += COMMANDS.BOLD_ON;
  content += COMMANDS.DOUBLE_HEIGHT_ON;
  content += '=== TESTE ===\n';
  content += COMMANDS.NORMAL;
  content += COMMANDS.BOLD_OFF;
  content += RESET_STYLE_STR; // Reset após destaque
  content += COMMANDS.ALIGN_LEFT;
  content += ''.padEnd(LINE_WIDTH, '-') + '\n';
  content += '\n';
  content += 'Zoopi Print Agent\n';
  content += 'Versao 2.1.0\n';
  content += '\n';
  content += `Impressora: ${config.printerType === 'usb' ? config.printerName : config.printerHost}\n`;
  content += `Codificacao: ${config.encoding}\n`;
  
  // Data formatada manualmente (sem toLocaleString)
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  content += `Data: ${day}/${month}/${year} ${hours}:${mins}\n`;
  content += '\n';
  
  // ========== TESTE OBRIGATÓRIO ==========
  // Esta linha DEVE sair exatamente assim: "TESTE: R$ 736,00"
  // Se sair "R$¬ã736.00", há problema de UTF-8/NBSP
  content += COMMANDS.BOLD_ON;
  content += '*** TESTE DE MOEDA ***\n';
  content += COMMANDS.BOLD_OFF;
  content += `TESTE: ${moneyBR(736)}\n`;
  content += `TESTE: ${moneyBR(1234.56)}\n`;
  content += `TESTE: ${moneyBR(99999)}\n`;
  content += '\n';
  
  // Teste de alinhamento
  content += COMMANDS.BOLD_ON;
  content += '*** TESTE ALINHAMENTO ***\n';
  content += COMMANDS.BOLD_OFF;
  content += formatLine('1x Produto Teste', moneyBR(25.90)) + '\n';
  content += formatLine('2x Item Longo Demais Para Caber', moneyBR(180)) + '\n';
  content += formatLine('TOTAL:', moneyBR(205.90)) + '\n';
  content += '\n';
  
  content += ''.padEnd(LINE_WIDTH, '-') + '\n';
  content += COMMANDS.ALIGN_CENTER;
  content += 'Impressao OK!\n';
  content += 'ASCII puro - sem NBSP\n';
  content += COMMANDS.ALIGN_LEFT;
  content += '\n\n\n';
  
  // IMPORTANTE: o teste precisa respeitar explicitamente o modo configurado.
  // Já tivemos casos onde o usuário seleciona a impressora USB, mas o teste
  // acaba indo pelo caminho de rede e dá "Timeout na impressão".
  return printContent(content, {
    copies: 1,
    printMode: config.printerType,
    printerName: config.printerName,
    printerHost: config.printerHost,
    printerPort: config.printerPort,
  });
}

// Exporta COMMANDS para uso em formatação
module.exports = {
  COMMANDS,
  listWindowsPrinters,
  testNetworkPrinter,
  testUsbPrinter,
  printToNetwork,
  printToUsb,
  printContent,
  printTestPage,
};
