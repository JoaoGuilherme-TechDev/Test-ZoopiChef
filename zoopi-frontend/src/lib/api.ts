/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { AlertPayload } from "@/modules/alerts/types";

const api = axios.create({
  baseURL: "http://localhost:3000/api",
});

// ============================================================
// NOVO: INTERCEPTOR DE REQUEST (Resolve o erro de deslogar)
// ============================================================
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("zoopi_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// ============================================================
// RESTAURADO: SEU SISTEMA DE MAPEAMENTO DE ALERTAS (IA)
// ============================================================
const FIELD_TAB_MAP: Record<string, string> = {
  name: 'info',
  category_id: 'info',
  type: 'info',
  price: 'precos',
  cost_price: 'precos',
  profit_margin: 'precos',
  sale_price: 'precos',
  ncm: 'fiscal',
  cest: 'fiscal',
  sku: 'fiscal',
  ean: 'fiscal',
  production_location: 'info',
  full_name: 'account',
  phone: 'account',
  telefone: 'account',
  email: 'account',
  oldPassword: 'security',
  newPassword: 'security',
  confirmPassword: 'security',
  password: 'security',
};

const URL_MODULE_MAP: Array<{ match: string; module: string; route: string; }> = [
  { match: "/orders",        module: "Pedidos",        route: "/principal/salao-pedidos/gestao-pedidos" },
  { match: "/products",      module: "Cardápio",       route: "/menu/products" },
  { match: "/categories",    module: "Cardápio",       route: "/menu/products" },
  { match: "/profiles",      module: "Perfil",         route: "/settings/profile" },
  { match: "/auth",          module: "Autenticação",   route: "/auth" },
];

function resolveModuleFromUrl(url: string | undefined) {
  if (!url) return { module: undefined, route: undefined };
  const entry = URL_MODULE_MAP.find((e) => url.includes(e.match));
  return entry ? { module: entry.module, route: entry.route } : { module: undefined, route: undefined };
}

let _pushAlert: ((payload: AlertPayload) => void) | null = null;
let _suppressNext = false;

export function registerAlertPush(fn: (payload: AlertPayload) => void) {
  _pushAlert = fn;
}

export function suppressNextAlert() {
  _suppressNext = true;
}

// ============================================================
// RESTAURADO: INTERCEPTOR DE RESPOSTA (Sua lógica original)
// ============================================================
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: any, error?: string }>) => {
    const status = error.response?.status;
    const url = error.config?.url;

    if (axios.isCancel(error)) return Promise.reject(error);

    // Tratamento de 401 (Unauthorized)
    if (status === 401 && !_suppressNext) {
      localStorage.removeItem("zoopi_token");
      localStorage.removeItem("zoopi_user");
      if (!window.location.pathname.includes("/auth")) window.location.href = "/auth";
      return Promise.reject(error);
    }

    if (_suppressNext) {
      _suppressNext = false;
      return Promise.reject(error);
    }

    // DISPARO DO SISTEMA DE ALERTA INTELIGENTE
    if (_pushAlert) {
      const serverData = error.response?.data;
      let message = "Ocorreu um erro inesperado.";
      let fields: string[] = [];

      const rawMsg = serverData?.message;
      const allPossibleFields = Object.keys(FIELD_TAB_MAP);
      
      const errorString = Array.isArray(rawMsg) 
        ? rawMsg.join(" ").toLowerCase() 
        : String(rawMsg || "").toLowerCase();

      // Detecta quais campos deram erro baseado na string do servidor
      fields = allPossibleFields.filter(f => {
        const fieldLower = f.toLowerCase();
        return errorString.includes(fieldLower) || 
               (fieldLower === 'phone' && errorString.includes('telefone')) ||
               (fieldLower === 'full_name' && errorString.includes('nome'));
      });

      if (fields.length === 0 && (status === 400 || status === 422)) {
        message = typeof rawMsg === 'string' ? rawMsg : "Verifique os dados do formulário.";
      } else if (fields.length > 0) {
        message = typeof rawMsg === 'string' ? rawMsg : "Existem campos que precisam de sua atenção.";
      } else {
        message = (typeof serverData?.message === 'string' ? serverData.message : message);
      }

      const { module, route } = resolveModuleFromUrl(url);
      const targetTab = fields.length > 0 ? FIELD_TAB_MAP[fields[0]] : undefined;

      _pushAlert({
        type: "error",
        message,
        module,
        route,
        fields,
        targetTab,
        routeLabel: targetTab ? "Resolver Agora" : "Verificar"
      });
    }

    return Promise.reject(error);
  }
);

export default api;