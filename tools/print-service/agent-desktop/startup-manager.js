/**
 * Gerenciamento de Inicialização Automática no Windows
 * Usa o Registro do Windows para iniciar com o sistema
 */

const Winreg = require('winreg');
const path = require('path');

const APP_NAME = 'ZoopiPrintAgent';
const REG_KEY = '\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';

/**
 * Obtém o caminho do executável atual
 */
function getExePath() {
  // Se estiver empacotado com pkg, usa o caminho do executável
  if (process.pkg) {
    return process.execPath;
  }
  // Em desenvolvimento, usa node + script
  return `"${process.execPath}" "${path.join(__dirname, 'main.js')}"`;
}

/**
 * Habilita inicialização automática com Windows
 */
function enableStartup() {
  return new Promise((resolve, reject) => {
    const regKey = new Winreg({
      hive: Winreg.HKCU,
      key: REG_KEY,
    });

    const exePath = getExePath();
    
    regKey.set(APP_NAME, Winreg.REG_SZ, exePath, (err) => {
      if (err) {
        console.error('Erro ao registrar startup:', err.message);
        reject(err);
      } else {
        console.log('✓ Inicialização automática habilitada');
        resolve(true);
      }
    });
  });
}

/**
 * Desabilita inicialização automática
 */
function disableStartup() {
  return new Promise((resolve, reject) => {
    const regKey = new Winreg({
      hive: Winreg.HKCU,
      key: REG_KEY,
    });

    regKey.remove(APP_NAME, (err) => {
      if (err) {
        // Ignora erro se a chave não existe
        if (err.message && err.message.includes('not exist')) {
          resolve(true);
        } else {
          console.error('Erro ao remover startup:', err.message);
          reject(err);
        }
      } else {
        console.log('✓ Inicialização automática desabilitada');
        resolve(true);
      }
    });
  });
}

/**
 * Verifica se a inicialização automática está habilitada
 */
function isStartupEnabled() {
  return new Promise((resolve) => {
    const regKey = new Winreg({
      hive: Winreg.HKCU,
      key: REG_KEY,
    });

    regKey.get(APP_NAME, (err, item) => {
      if (err || !item) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

/**
 * Alterna estado da inicialização automática
 */
async function toggleStartup() {
  const enabled = await isStartupEnabled();
  
  if (enabled) {
    await disableStartup();
    return false;
  } else {
    await enableStartup();
    return true;
  }
}

module.exports = {
  enableStartup,
  disableStartup,
  isStartupEnabled,
  toggleStartup,
};
