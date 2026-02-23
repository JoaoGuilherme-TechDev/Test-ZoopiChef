/**
 * PWA Access Flow Configuration - Reference Guide
 * 
 * This file documents the standardized access flow for all PWAs.
 * Each app MUST follow this state machine for consistent behavior.
 * 
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                    PWA ACCESS STATE MACHINE                     │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  INIT → SLUG_ENTRY → RESTAURANT_RESOLVED → PIN_ENTRY → READY   │
 * │                              ↓                                   │
 * │                        (if public)                              │
 * │                              ↓                                   │
 * │                           READY                                  │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * ## Apps and Their Configurations:
 * 
 * | App         | Route              | Auth  | Role      | Edge Function    |
 * |-------------|--------------------| ------|-----------|------------------|
 * | Totem       | /:slug/totem       | No    | PUBLIC    | -                |
 * | Tablet      | /:slug/tablet      | No    | PUBLIC    | -                |
 * | Garçom      | /:slug/garcom      | Yes   | WAITER    | waiter-auth      |
 * | Entregador  | /:slug/entregador  | Yes   | DELIVERY  | entregador-auth  |
 * | PDV         | /:slug/pdv         | Yes   | CASHIER   | pdv-auth         |
 * | Terminal    | /:slug/terminal    | Yes   | OPERATOR  | terminal-auth    |
 * 
 * ## Usage Example:
 * 
 * ```tsx
 * import { PWAAuthShell, PWA_CONFIGS } from '@/components/pwa/PWAAuthShell';
 * import { User } from 'lucide-react';
 * 
 * export default function MyPWA() {
 *   return (
 *     <PWAAuthShell 
 *       config={PWA_CONFIGS.garcom} 
 *       appIcon={<User className="w-10 h-10 text-blue-500" />}
 *     >
 *       {({ restaurant, user, logout }) => (
 *         <MyAppContent 
 *           restaurant={restaurant}
 *           user={user}
 *           onLogout={logout}
 *         />
 *       )}
 *     </PWAAuthShell>
 *   );
 * }
 * ```
 * 
 * ## Security Rules:
 * 
 * 1. QR codes MUST contain only the restaurant slug - never tokens or credentials
 * 2. PIN authentication is required for staff apps (waiter, delivery, pdv, terminal)
 * 3. Sessions are isolated per role - a waiter session cannot access PDV
 * 4. Session tokens are stored in localStorage with 30-day expiry
 * 5. Restaurant slug is cached for 24 hours to reduce database calls
 * 
 * ## Persistence Keys:
 * 
 * - `pwa_unified_context` - Main PWA context (restaurant + function)
 * - `pwa_slug_cache` - 24h cache of validated restaurant slugs
 * - `{function}_session_token` - Session token per role
 * - `{function}_restaurant_slug` - Last used slug per app
 * 
 * ## Migration from Legacy:
 * 
 * Old PWAs used inconsistent patterns. To migrate:
 * 
 * 1. Import PWAAuthShell and the correct config from PWA_CONFIGS
 * 2. Wrap your app content with PWAAuthShell
 * 3. Remove old slug entry and auth logic
 * 4. Use the context provided by the shell (restaurant, user, logout)
 */

export const PWA_ACCESS_FLOW_VERSION = '3.0.0';

export const SUPPORTED_APPS = [
  'totem',
  'tablet', 
  'garcom',
  'entregador',
  'pdv',
  'terminal',
] as const;

export type SupportedApp = typeof SUPPORTED_APPS[number];

export const APP_ROUTES: Record<SupportedApp, string> = {
  totem: '/:slug/totem',
  tablet: '/:slug/tablet',
  garcom: '/:slug/garcom',
  entregador: '/:slug/entregador',
  pdv: '/:slug/pdv',
  terminal: '/:slug/terminal',
};

export const AUTH_REQUIRED_APPS: SupportedApp[] = ['garcom', 'entregador', 'pdv', 'terminal'];
export const PUBLIC_APPS: SupportedApp[] = ['totem', 'tablet'];
