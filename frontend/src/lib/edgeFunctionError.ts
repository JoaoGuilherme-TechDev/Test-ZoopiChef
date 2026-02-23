type ParsedFunctionError = {
  message: string;
  status?: number;
  body?: any;
};

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function formatKnownErrorBody(body: any): string | null {
  if (!body || typeof body !== 'object') return null;
  const errMsg = body.error || body.message;
  if (!errMsg) return null;

  // Online store closed pattern (public-create-order)
  const reason = body.reason;
  const next = body.next_open_at;
  const details = [reason, next ? `Próxima abertura: ${next}` : null]
    .filter(Boolean)
    .join(' • ');

  return details ? `${errMsg}: ${details}` : String(errMsg);
}

/**
 * Extracts a user-friendly message from supabase.functions.invoke errors.
 * Works across different supabase-js internal error shapes.
 */
export async function parseFunctionInvokeError(err: unknown): Promise<ParsedFunctionError> {
  const e = err as any;

  const status: number | undefined =
    e?.context?.status ??
    e?.status ??
    e?.context?.response?.status;

  // 1) Newer shapes: { context: { body: string | object } }
  const ctxBody = e?.context?.body;
  if (ctxBody) {
    const parsed = typeof ctxBody === 'string' ? safeJsonParse(ctxBody) : ctxBody;
    const formatted = formatKnownErrorBody(parsed);
    return { message: formatted || e?.message || 'Erro ao processar requisição', status, body: parsed ?? ctxBody };
  }

  // 2) Some shapes: { context: { response: Response } }
  const resp: Response | undefined = e?.context?.response;
  if (resp && typeof (resp as any).json === 'function') {
    try {
      const json = await (resp as any).json();
      const formatted = formatKnownErrorBody(json);
      return { message: formatted || e?.message || 'Erro ao processar requisição', status: resp.status, body: json };
    } catch {
      // ignore
    }
  }

  // 3) Fallback
  return { message: e?.message || 'Erro ao processar requisição', status };
}
