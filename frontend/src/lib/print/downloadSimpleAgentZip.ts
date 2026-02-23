import JSZip from "jszip";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Vite raw import (arquivo fora de /src)
import agentJs from "../../../../print-service/simple-agent/agent.js?raw";

/**
 * Gera um ZIP do "Zoopi Print Agent v3.0" no navegador.
 * - Usa node-thermal-printer + printer (bindings nativos C++)
 * - Suporta USB Windows + Rede TCP/IP
 */
export async function createSimpleAgentZipBlob(params: {
  companyId: string;
}): Promise<Blob> {
  const AGENT_VERSION = "3.0.0";

  const zip = new JSZip();
  const root = zip.folder("zoopi-print-agent");
  if (!root) throw new Error("Falha ao criar zip");

  root.file(
    "INICIAR.bat",
    [
      "@echo off",
      "chcp 65001 >nul",
      "cd /d \"%~dp0\"",
      "echo.",
      "echo ========================================",
      `echo   ZOOPI PRINT AGENT v${AGENT_VERSION} (GRAFICO)`,
      "echo ========================================",
      "echo.",
      "",
      "if not exist node_modules (",
      "  echo Instalando bibliotecas de impressao...",
      "  echo.",
      "  call npm install",
      "  echo.",
      ")",
      "",
      "echo Iniciando agente...",
      "node agent.js",
      "pause",
      "",
    ].join("\r\n")
  );

  root.file(
    "package.json",
    JSON.stringify(
      {
        name: "zoopi-print-agent",
        version: AGENT_VERSION,
        description: "Agente de impressao profissional para Zoopi (Grafico + Rede)",
        main: "agent.js",
        scripts: { start: "node agent.js" },
        dependencies: {
          "@supabase/supabase-js": "^2.49.1",
          "node-thermal-printer": "^4.5.0",
          "@iamtomcat/printer": "^0.7.0",
        },
      },
      null,
      2
    )
  );

  // Conteúdo do agente (do repositório) como texto para download
  root.file("agent.js", agentJs as string);

  root.file(
    "config.json",
    JSON.stringify(
      {
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
        supabaseKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        companyId: params.companyId,
        printerName: "Server",
        kitchenPrinterIp: "",
        barPrinterIp: "",
        encoding: "cp860",
      },
      null,
      2
    )
  );

  root.file(
    "LEIAME.txt",
    [
      `ZOOPI PRINT AGENT v${AGENT_VERSION} (GRAFICO + REDE)`,
      "",
      "Agente profissional de impressao usando bibliotecas nativas.",
      "Suporta: USB Windows + Impressoras de Rede (TCP/IP)",
      "",
      "REQUISITOS",
      "- Node.js 18+ (https://nodejs.org/)",
      "- Windows com Visual Studio Build Tools (para compilar 'printer')",
      "  Instale: npm install -g windows-build-tools",
      "",
      "COMO USAR",
      "1) Edite config.json:",
      "   - printerName: nome EXATO da impressora no Windows",
      "   - kitchenPrinterIp: IP da impressora de cozinha (opcional)",
      "   - barPrinterIp: IP da impressora do bar (opcional)",
      "",
      "2) Rode INICIAR.bat ou:",
      "   npm install",
      "   npm start",
      "",
      "NOTA: O npm install pode demorar na primeira vez (compila bindings C++).",
      "",
    ].join("\r\n")
  );

  return zip.generateAsync({ type: "blob" });
}

/**
 * Compat: mantém a API antiga (tenta disparar download automaticamente).
 * Observação: em alguns navegadores/iframes o clique programático pode ser bloqueado.
 */
export async function downloadSimpleAgentZip(params: {
  companyId: string;
}): Promise<void> {
  const AGENT_VERSION = "3.0.0";
  const blob = await createSimpleAgentZipBlob(params);
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  // Nome com versão + timestamp para evitar cache do navegador/Windows
  a.download = `zoopi-print-agent-v${AGENT_VERSION}-${Date.now()}.zip`;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();

  // evita revogar antes do browser começar o download
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
