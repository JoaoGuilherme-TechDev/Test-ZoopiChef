/**
 * Gerenciamento de Notificações Windows
 */

const notifier = require('node-notifier');
const path = require('path');

// Caminho do ícone (será empacotado junto)
const ICON_PATH = path.join(__dirname, 'assets', 'icon.png');

/**
 * Exibe uma notificação nativa do Windows
 */
function notify(title, message, options = {}) {
  try {
    notifier.notify({
      title: title || 'Zoopi Print Agent',
      message: message,
      icon: ICON_PATH,
      sound: options.sound !== false,
      wait: options.wait || false,
      appID: 'Zoopi Print Agent',
    });
  } catch (e) {
    console.error('Erro ao exibir notificação:', e.message);
  }
}

/**
 * Notificação de sucesso de impressão
 */
function notifyPrintSuccess(orderId) {
  notify('Impressão Concluída', `Pedido #${orderId.slice(0, 8)} impresso com sucesso!`);
}

/**
 * Notificação de erro de impressão
 */
function notifyPrintError(orderId, error) {
  notify('Erro de Impressão', `Falha ao imprimir pedido #${orderId.slice(0, 8)}: ${error}`);
}

/**
 * Notificação de conexão perdida
 */
function notifyConnectionLost() {
  notify('Conexão Perdida', 'A conexão com o servidor foi perdida. Tentando reconectar...');
}

/**
 * Notificação de reconexão
 */
function notifyReconnected() {
  notify('Reconectado', 'Conexão restabelecida com sucesso!');
}

module.exports = {
  notify,
  notifyPrintSuccess,
  notifyPrintError,
  notifyConnectionLost,
  notifyReconnected,
};
