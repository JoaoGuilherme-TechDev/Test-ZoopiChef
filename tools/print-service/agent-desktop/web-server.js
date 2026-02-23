/**
 * Servidor Web para Interface de Configuração
 */

const http = require('http');

// Imports lazy para evitar dependência circular
let configManager = null;
let agentCore = null;
let printer = null;
let trayManager = null;

function getConfigManager() {
  if (!configManager) configManager = require('./config-manager');
  return configManager;
}

function getAgentCore() {
  if (!agentCore) agentCore = require('./agent-core');
  return agentCore;
}

function getPrinter() {
  if (!printer) printer = require('./printer');
  return printer;
}

function getTrayManager() {
  if (!trayManager) trayManager = require('./tray-manager');
  return trayManager;
}

// HTML da página de configuração
const HTML_PAGE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zoopi Print Agent - Configuração</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      color: #fff;
      padding: 20px;
    }
    .container { max-width: 600px; margin: 0 auto; }
    h1 { 
      text-align: center; 
      margin-bottom: 30px;
      font-size: 24px;
    }
    .card {
      background: rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
      backdrop-filter: blur(10px);
    }
    .card h2 {
      font-size: 14px;
      margin-bottom: 16px;
      color: #4ade80;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .form-group { margin-bottom: 14px; }
    label {
      display: block;
      font-size: 13px;
      margin-bottom: 6px;
      color: #94a3b8;
    }
    input, select {
      width: 100%;
      padding: 12px;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      background: rgba(0,0,0,0.3);
      color: #fff;
      font-size: 14px;
    }
    input:focus, select:focus {
      outline: none;
      border-color: #4ade80;
    }
    .row { display: flex; gap: 12px; }
    .row .form-group { flex: 1; }
    button {
      width: 100%;
      padding: 14px;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 8px;
    }
    .btn-primary { background: #4ade80; color: #000; }
    .btn-primary:hover { background: #22c55e; }
    .btn-secondary { background: rgba(255,255,255,0.1); color: #fff; }
    .btn-secondary:hover { background: rgba(255,255,255,0.2); }
    .btn-danger { background: #ef4444; color: #fff; }
    .btn-danger:hover { background: #dc2626; }
    .status-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px;
      border-radius: 8px;
      margin-bottom: 16px;
    }
    .status-bar.online { background: rgba(74, 222, 128, 0.2); border: 1px solid rgba(74, 222, 128, 0.3); }
    .status-bar.offline { background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.3); }
    .status-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    .status-bar.online .status-dot { background: #4ade80; }
    .status-bar.offline .status-dot { background: #ef4444; }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .stats { display: flex; gap: 20px; font-size: 13px; color: #94a3b8; }
    .printers-list {
      background: rgba(0,0,0,0.2);
      border-radius: 8px;
      padding: 10px;
      max-height: 120px;
      overflow-y: auto;
      font-size: 13px;
    }
    .printers-list div {
      padding: 8px 10px;
      cursor: pointer;
      border-radius: 4px;
      margin-bottom: 2px;
    }
    .printers-list div:hover { background: rgba(255,255,255,0.1); }
    .hidden { display: none; }
    .toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 1000;
      animation: slideUp 0.3s ease;
    }
    .toast.success { background: #4ade80; color: #000; }
    .toast.error { background: #ef4444; color: #fff; }
    @keyframes slideUp {
      from { opacity: 0; transform: translateX(-50%) translateY(20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    .checkbox-row {
      display: flex;
      gap: 20px;
    }
    .checkbox-row label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      color: #fff;
    }
    .checkbox-row input[type="checkbox"] {
      width: 18px;
      height: 18px;
    }
    .version {
      text-align: center;
      font-size: 12px;
      color: #64748b;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🖨️ Zoopi Print Agent</h1>
    
    <div id="status-bar" class="status-bar offline">
      <div class="status-dot"></div>
      <div>
        <div id="status-text" style="font-weight: 600;">Parado</div>
        <div class="stats">
          <span>✅ <span id="stat-printed">0</span></span>
          <span>❌ <span id="stat-failed">0</span></span>
          <span id="stat-last"></span>
        </div>
      </div>
    </div>
    
    <div class="card">
      <h2>🔗 Conexão Zoopi</h2>
      <div class="form-group">
        <label>URL do Supabase</label>
        <input type="text" id="supabaseUrl" placeholder="https://xxx.supabase.co">
      </div>
      <div class="form-group">
        <label>Chave Anon</label>
        <input type="password" id="supabaseKey" placeholder="eyJhbGci...">
      </div>
      <div class="form-group">
        <label>ID da Empresa</label>
        <input type="text" id="companyId" placeholder="uuid-da-empresa">
      </div>

      <div class="row">
        <div class="form-group">
          <label>Email do Agente</label>
          <input type="text" id="agentEmail" placeholder="seu-email@empresa.com">
        </div>
        <div class="form-group">
          <label>Senha do Agente</label>
          <input type="password" id="agentPassword" placeholder="********">
        </div>
      </div>
      <div class="version" style="margin-top: 8px;">
        Necessário para o agente ler/atualizar a fila protegida.
      </div>
    </div>
    
    <div class="card">
      <h2>🖨️ Impressora Principal (Padrão)</h2>
      <div class="form-group">
        <label>Tipo</label>
        <select id="printerType" onchange="togglePrinterType()">
          <option value="network">Rede (TCP/IP)</option>
          <option value="usb">USB (Windows)</option>
        </select>
      </div>
      
      <div id="network-fields">
        <div class="row">
          <div class="form-group">
            <label>IP da Impressora</label>
            <input type="text" id="printerHost" placeholder="192.168.1.100">
          </div>
          <div class="form-group" style="max-width: 100px;">
            <label>Porta</label>
            <input type="number" id="printerPort" value="9100">
          </div>
        </div>
      </div>
      
      <div id="usb-fields" class="hidden">
        <div class="form-group">
          <label>Nome da Impressora</label>
          <input type="text" id="printerName" placeholder="EPSON TM-T20">
        </div>
        <div class="form-group">
          <label>Impressoras Detectadas (clique para selecionar)</label>
          <div id="printers-list" class="printers-list">Carregando...</div>
        </div>
        <div class="version" style="margin: 10px 0;">
          💡 Para impressoras compartilhadas em outro PC, use:<br>
          <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">\\\\NOME-PC\\Nome da Impressora</code>
        </div>
      </div>
      
      <button class="btn-secondary" onclick="testPrinter()">🔍 Testar Conexão</button>
    </div>
    
    <div class="card">
      <h2>🖨️ Impressoras por Setor (Opcional)</h2>
      <div class="version" style="margin-bottom: 12px; color: #94a3b8;">
        Configure impressoras específicas para cada setor de produção diretamente no sistema Zoopi:<br>
        <strong>Configurações → Setores de Impressão → Editar Setor</strong>
      </div>
      <div style="background: rgba(0,0,0,0.2); border-radius: 8px; padding: 12px; font-size: 13px;">
        <div style="margin-bottom: 8px;">
          <strong style="color: #4ade80;">✓ USB Local:</strong> Nome exato da impressora (ex: <code>EPSON TM-T20</code>)
        </div>
        <div style="margin-bottom: 8px;">
          <strong style="color: #4ade80;">✓ USB em outro PC:</strong> <code>\\\\NOME-PC\\Impressora</code>
        </div>
        <div>
          <strong style="color: #4ade80;">✓ Rede TCP/IP:</strong> IP:Porta (ex: <code>192.168.1.100:9100</code>)
        </div>
      </div>
    </div>
    
    <div class="card">
      <h2>⚙️ Opções</h2>
      <div class="row">
        <div class="form-group">
          <label>Codificação</label>
          <select id="encoding">
            <option value="cp860">CP860 (Português)</option>
            <option value="cp850">CP850</option>
            <!-- UTF-8 quebra ESC/POS (gera bytes multi-byte). Mantido desabilitado para evitar "não imprime"/lixo. -->
            <option value="utf8" disabled>UTF-8 (NÃO usar)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Cópias</label>
          <input type="number" id="copies" min="1" max="5" value="1">
        </div>
      </div>
      <div class="checkbox-row">
        <label><input type="checkbox" id="beepOnPrint" checked> Beep ao imprimir</label>
        <label><input type="checkbox" id="cutAfterPrint" checked> Cortar papel</label>
      </div>
    </div>
    
    <button class="btn-primary" onclick="saveAndStart()">💾 Salvar e Iniciar</button>
    <button class="btn-danger" onclick="stopAgentBtn()">⏹️ Parar Agente</button>
    <button class="btn-secondary" onclick="printTestBtn()">🖨️ Imprimir Teste</button>
    
    <div class="version">Zoopi Print Agent v2.0.0 - Desktop Edition</div>
  </div>
  
  <script>
    function showToast(msg, type) {
      const existing = document.querySelector('.toast');
      if (existing) existing.remove();
      
      const toast = document.createElement('div');
      toast.className = 'toast ' + type;
      toast.textContent = msg;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
    
    function togglePrinterType() {
      const type = document.getElementById('printerType').value;
      document.getElementById('network-fields').classList.toggle('hidden', type !== 'network');
      document.getElementById('usb-fields').classList.toggle('hidden', type !== 'usb');
      if (type === 'usb') loadPrinters();
    }
    
    async function loadPrinters() {
      try {
        const res = await fetch('/api/printers');
        const data = await res.json();
        const list = document.getElementById('printers-list');
        
        if (data.printers?.length > 0) {
          list.innerHTML = data.printers.map(p => 
            '<div onclick="selectPrinter(this)">' + p + '</div>'
          ).join('');
        } else {
          list.innerHTML = '<div style="color:#94a3b8">Nenhuma impressora encontrada</div>';
        }
      } catch (e) {
        console.error(e);
      }
    }
    
    function selectPrinter(el) {
      document.getElementById('printerName').value = el.textContent;
      showToast('Impressora selecionada: ' + el.textContent, 'success');
    }
    
    async function loadConfig() {
      try {
        const res = await fetch('/api/config');
        const data = await res.json();

        document.getElementById('supabaseUrl').value = data.supabaseUrl || '';
        document.getElementById('supabaseKey').value = data.supabaseKey || '';
        document.getElementById('companyId').value = data.companyId || '';
        document.getElementById('agentEmail').value = data.agentEmail || '';
        document.getElementById('agentPassword').value = data.agentPassword || '';
        document.getElementById('printerType').value = data.printerType || 'network';
        document.getElementById('printerHost').value = data.printerHost || '192.168.1.100';
        document.getElementById('printerPort').value = data.printerPort || 9100;
        document.getElementById('printerName').value = data.printerName || '';
        document.getElementById('encoding').value = data.encoding || 'cp860';
        document.getElementById('copies').value = data.copies || 1;
        document.getElementById('beepOnPrint').checked = data.beepOnPrint !== false;
        document.getElementById('cutAfterPrint').checked = data.cutAfterPrint !== false;

        togglePrinterType();
      } catch (e) {
        console.error(e);
      }
    }
    
    async function loadStatus() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        
        const bar = document.getElementById('status-bar');
        const text = document.getElementById('status-text');
        
        if (data.isRunning) {
          bar.className = 'status-bar online';
          text.textContent = 'Monitorando fila...';
        } else {
          bar.className = 'status-bar offline';
          text.textContent = data.lastError || 'Parado';
        }
        
        document.getElementById('stat-printed').textContent = data.printed || 0;
        document.getElementById('stat-failed').textContent = data.failed || 0;
        
        if (data.lastPrint) {
          document.getElementById('stat-last').textContent = 
            '🕐 ' + new Date(data.lastPrint).toLocaleTimeString('pt-BR');
        }
      } catch (e) {
        console.error(e);
      }
    }
    
    async function testPrinter() {
      const type = document.getElementById('printerType').value;
      const body = type === 'usb' 
        ? { type: 'usb', printerName: document.getElementById('printerName').value }
        : { type: 'network', host: document.getElementById('printerHost').value, port: parseInt(document.getElementById('printerPort').value) };
      
      try {
        const res = await fetch('/api/test-printer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        
        if (data.success) {
          showToast('✅ Impressora conectada!', 'success');
        } else {
          showToast('❌ ' + (data.error || 'Falha'), 'error');
        }
      } catch (e) {
        showToast('❌ Erro ao testar', 'error');
      }
    }
    
    async function saveAndStart() {
      const cfg = {
        supabaseUrl: document.getElementById('supabaseUrl').value.trim(),
        supabaseKey: document.getElementById('supabaseKey').value.trim(),
        companyId: document.getElementById('companyId').value.trim(),
        agentEmail: document.getElementById('agentEmail').value.trim(),
        agentPassword: document.getElementById('agentPassword').value,
        printerType: document.getElementById('printerType').value,
        printerHost: document.getElementById('printerHost').value.trim(),
        printerPort: parseInt(document.getElementById('printerPort').value) || 9100,
        printerName: document.getElementById('printerName').value.trim(),
        encoding: document.getElementById('encoding').value,
        copies: parseInt(document.getElementById('copies').value) || 1,
        beepOnPrint: document.getElementById('beepOnPrint').checked,
        cutAfterPrint: document.getElementById('cutAfterPrint').checked
      };
      
      try {
        const res = await fetch('/api/save-and-start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cfg)
        });
        const data = await res.json();
        
        if (data.success) {
          showToast('✅ Agente iniciado!', 'success');
        } else {
          showToast('❌ ' + (data.error || 'Erro'), 'error');
        }
        
        setTimeout(loadStatus, 500);
      } catch (e) {
        showToast('❌ Erro ao salvar', 'error');
      }
    }
    
    async function stopAgentBtn() {
      try {
        await fetch('/api/stop', { method: 'POST' });
        showToast('⏹️ Agente parado', 'success');
        setTimeout(loadStatus, 500);
      } catch (e) {
        console.error(e);
      }
    }
    
    async function printTestBtn() {
      try {
        const res = await fetch('/api/print-test', { method: 'POST' });
        const data = await res.json();
        
        if (data.success) {
          showToast('✅ Teste enviado!', 'success');
        } else {
          showToast('❌ ' + (data.error || 'Erro'), 'error');
        }
      } catch (e) {
        showToast('❌ Erro ao imprimir', 'error');
      }
    }
    
    // Init
    loadConfig();
    loadStatus();
    setInterval(loadStatus, 3000);
  </script>
</body>
</html>`;

/**
 * Inicia o servidor HTTP
 */
function startWebServer(port = 3847, options = {}) {
  const maxPort = typeof options.maxPort === 'number' ? options.maxPort : 3852;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    // Healthcheck (unificado) - usado pelo front-end
    if ((url.pathname === '/agent/health' || url.pathname === '/health') && req.method === 'GET') {
      try {
        const printers = await getPrinter().listWindowsPrinters();
        const status = getAgentCore().getStats();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            online: true,
            version: status?.version || 'desktop-agent',
            printers,
            lastSeen: new Date().toISOString(),
          })
        );
      } catch (e) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            online: true,
            version: 'desktop-agent',
            printers: [],
            lastSeen: new Date().toISOString(),
          })
        );
      }
      return;
    }

    // Página principal
    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(HTML_PAGE);
      return;
    }
    
    // API: Config
    if (url.pathname === '/api/config' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(getConfigManager().getConfig()));
      return;
    }
    
    // API: Status
    if (url.pathname === '/api/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(getAgentCore().getStats()));
      return;
    }
    
    // API: Printers
    if (url.pathname === '/api/printers') {
      const printers = await getPrinter().listWindowsPrinters();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ printers }));
      return;
    }
    
    // API: Test printer
    if (url.pathname === '/api/test-printer' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          let result;
          const printerModule = getPrinter();
          
          if (data.type === 'usb') {
            result = await printerModule.testUsbPrinter(data.printerName);
          } else {
            result = await printerModule.testNetworkPrinter(data.host, data.port);
          }
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
    }
    
    // API: Print test
    if (url.pathname === '/api/print-test' && req.method === 'POST') {
      try {
        const result = await getAgentCore().printTest();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
      return;
    }
    
    // API: Save and start
    if (url.pathname === '/api/save-and-start' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const newConfig = JSON.parse(body);

          // Para agente atual
          getAgentCore().stopAgent();

          // Salva config
          getConfigManager().saveConfig(newConfig);

          // Inicia agente (aguarda login e inicialização)
          const result = await getAgentCore().startAgent();

          // Atualiza tray
          try {
            if (result.success) {
              getTrayManager().updateTrayStatus('running');
            } else {
              getTrayManager().updateTrayStatus('error');
            }
          } catch (_) {} // tray pode não estar disponível

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
    }
    
    // API: Stop
    if (url.pathname === '/api/stop' && req.method === 'POST') {
      const result = getAgentCore().stopAgent();
      try {
        getTrayManager().updateTrayStatus('stopped');
      } catch (_) {} // tray pode não estar disponível
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }
    
    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });
  
  const tryListen = (p) => {
    server.listen(p, () => {
      server.__port = p;
      console.log(`Servidor web iniciado em http://localhost:${p}`);
    });
  };

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(`Porta ${port} já está em uso`);
      if (port < maxPort) {
        port = port + 1;
        console.log(`Tentando próxima porta: ${port}`);
        tryListen(port);
        return;
      }
      console.error(`Nenhuma porta livre entre 3847 e ${maxPort}.`);
      return;
    }
    console.error('Erro no servidor:', err && err.message ? err.message : String(err));
  });

  tryListen(port);

  return { server, port: server.__port || port };
}

module.exports = {
  startWebServer,
};
