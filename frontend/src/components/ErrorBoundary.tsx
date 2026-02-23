import React from "react";

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: unknown, info: React.ErrorInfo) => void;
};

type State = { hasError: boolean; error?: unknown; info?: React.ErrorInfo };

function getErrorText(error: unknown) {
  if (!error) return "";
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    this.setState({ info });
    this.props.onError?.(error, info);
    // Always log so we can debug “tela preta” cases.
    console.error("[ErrorBoundary] Uncaught error", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="max-w-md text-center p-6">
              <h1 className="text-xl font-semibold text-foreground">Algo deu errado</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Tente recarregar a página. Se continuar, toque em “Copiar erro” e me envie aqui.
              </p>

              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
                  onClick={() => window.location.reload()}
                >
                  Recarregar
                </button>
                <button
                  className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground"
                  onClick={() => {
                    const payload = [
                      `URL: ${window.location.href}`,
                      `Error: ${getErrorText(this.state.error)}`,
                      this.state.info?.componentStack ? `Stack:${this.state.info.componentStack}` : "",
                    ]
                      .filter(Boolean)
                      .join("\n");

                    navigator.clipboard.writeText(payload);
                  }}
                >
                  Copiar erro
                </button>
              </div>

              {/* Detalhes (somente para ajudar no suporte) */}
              {this.state.error ? (
                <pre className="mt-4 max-h-40 overflow-auto rounded-lg border border-border bg-muted/30 p-3 text-left text-xs text-muted-foreground whitespace-pre-wrap">
                  {getErrorText(this.state.error)}
                </pre>
              ) : null}
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
