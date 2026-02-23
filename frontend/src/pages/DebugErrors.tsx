import { useMemo, useState } from "react";
import { clearErrorLogs, getErrorStats, getStoredErrors, type ErrorLog } from "@/lib/errorMonitoring";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DebugErrors() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<ErrorLog["type"] | "all">("all");

  const stats = useMemo(() => getErrorStats(), []);
  const all = useMemo(() => getStoredErrors(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((e) => {
      if (type !== "all" && e.type !== type) return false;
      if (!q) return true;
      return (
        e.message.toLowerCase().includes(q) ||
        (e.stack?.toLowerCase().includes(q) ?? false) ||
        JSON.stringify(e.context ?? {}).toLowerCase().includes(q)
      );
    });
  }, [all, query, type]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <h1 className="text-2xl font-semibold">Diagnóstico de Erros</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lista de erros capturados no navegador (local) para identificar módulos/rotas com falha.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6 space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total</div>
            <div className="text-2xl font-semibold">{stats.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Erros</div>
            <div className="text-2xl font-semibold">{stats.errors}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Warnings</div>
            <div className="text-2xl font-semibold">{stats.warnings}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Últimas 24h</div>
            <div className="text-2xl font-semibold">{stats.last24h}</div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por mensagem, stack ou contexto…"
                className="md:w-[420px]"
              />
              <div className="flex gap-2">
                <Button variant={type === "all" ? "default" : "secondary"} onClick={() => setType("all")}>Todos</Button>
                <Button variant={type === "error" ? "default" : "secondary"} onClick={() => setType("error")}>Erros</Button>
                <Button variant={type === "warning" ? "default" : "secondary"} onClick={() => setType("warning")}>Warnings</Button>
                <Button variant={type === "info" ? "default" : "secondary"} onClick={() => setType("info")}>Info</Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  const payload = { generatedAt: new Date().toISOString(), stats, errors: all };
                  downloadJson(`error-logs-${new Date().toISOString().slice(0, 10)}.json`, payload);
                }}
              >
                Exportar JSON
              </Button>
              <Button
                variant="secondary"
                onClick={async () => {
                  const payload = { generatedAt: new Date().toISOString(), stats, errors: all };
                  await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
                }}
              >
                Copiar
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  clearErrorLogs();
                  window.location.reload();
                }}
              >
                Limpar
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <Card className="p-6">
              <div className="text-sm text-muted-foreground">Nenhum erro encontrado com o filtro atual.</div>
            </Card>
          ) : (
            filtered.map((e) => (
              <Card key={e.id} className="p-4">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs rounded-md border border-border px-2 py-1 bg-muted">{e.type}</span>
                      <span className="text-xs text-muted-foreground">{new Date(e.timestamp).toLocaleString()}</span>
                      {e.url ? <span className="text-xs text-muted-foreground truncate max-w-[520px]">{e.url}</span> : null}
                    </div>
                    <div className="text-xs text-muted-foreground">{e.id}</div>
                  </div>

                  <div className="font-medium break-words">{e.message}</div>

                  {e.stack ? (
                    <pre className="mt-1 max-h-56 overflow-auto rounded-md border border-border bg-muted p-3 text-xs whitespace-pre-wrap">
                      {e.stack}
                    </pre>
                  ) : null}

                  {e.context ? (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground">Contexto</summary>
                      <pre className="mt-2 max-h-56 overflow-auto rounded-md border border-border bg-muted p-3 text-xs whitespace-pre-wrap">
                        {JSON.stringify(e.context, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </div>
              </Card>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
