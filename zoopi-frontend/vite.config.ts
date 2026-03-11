import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// Gerador de timestamp para evitar cache antigo no build
const buildTimestamp = Date.now().toString();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Injeta variáveis de ambiente de build
  define: {
    'import.meta.env.VITE_BUILD_TIMESTAMP': JSON.stringify(buildTimestamp),
    'import.meta.env.VITE_BUILD_VERSION': JSON.stringify(`v${new Date().toISOString().slice(0, 10)}`),
  },
  server: {
    host: "::",
    port: 8080,
    // CONFIGURAÇÃO DE PROXY: Resolve o erro 404 nas chamadas de API
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Alinhado com seu README (NestJS)
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path // Mantém o prefixo /api conforme seu padrão Nest
      }
    }
  },
  // Configuração de build com cache busting nos nomes dos arquivos
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash]-${buildTimestamp.slice(-6)}.js`,
        chunkFileNames: `assets/[name]-[hash]-${buildTimestamp.slice(-6)}.js`,
        assetFileNames: `assets/[name]-[hash]-${buildTimestamp.slice(-6)}.[ext]`,
      },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        name: "Zoopi",
        short_name: "Zoopi",
        description: "Sistema de Gestão para Restaurantes - Zoopi Tecnologia",
        theme_color: "#6366f1",
        background_color: "#0a0a0a",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        id: "zoopi-main",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 3,
            },
          },
          // Cache para recursos estáticos
          {
            urlPattern: /\.(?:js|css)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "static-resources",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Estratégia para chamadas de API (Prioriza rede, mas aceita cache se offline)
          {
            urlPattern: /\/api\/.*/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24,
              },
              networkTimeoutSeconds: 5,
            },
          }
        ],
      },
      // Habilita o PWA em modo de desenvolvimento para evitar erros de 404/Syntax no manifest
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));