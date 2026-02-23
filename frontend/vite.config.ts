import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// Generate unique build timestamp for cache busting
const buildTimestamp = Date.now().toString();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Inject build timestamp as environment variable
  define: {
    'import.meta.env.VITE_BUILD_TIMESTAMP': JSON.stringify(buildTimestamp),
    'import.meta.env.VITE_BUILD_VERSION': JSON.stringify(`v${new Date().toISOString().slice(0, 10)}`),
  },
  server: {
    host: "::",
    port: 8080,
  },
  // Add cache busting to build output
  build: {
    rollupOptions: {
      output: {
        // Add hash to chunk filenames for cache busting
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
      includeAssets: ["favicon.ico", "robots.txt"],
      manifest: {
        name: "Zoopi",
        short_name: "Zoopi",
        description: "Sistema de Gestão para Restaurantes - Zoopi Tecnologia",
        theme_color: "#6366f1",
        background_color: "#0a0a0a",
        display: "standalone",
        orientation: "portrait",
        // Main app scope - does NOT overlap with /pwa/* apps
        scope: "/",
        start_url: "/",
        // Unique ID to distinguish from PWA apps
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
        // Skip HTML caching - always fetch fresh
        globPatterns: ["**/*.{js,css,ico,png,svg,woff2}"],
        // Increase limit for large bundles
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        // Clean old caches on update
        cleanupOutdatedCaches: true,
        // Skip waiting immediately when new SW is available
        skipWaiting: true,
        // Claim clients immediately
        clientsClaim: true,
        runtimeCaching: [
          // HTML pages - ALWAYS Network First with short cache
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60, // Only 1 minute cache for HTML
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 3, // Fast timeout to prevent stale
            },
          },
          // JS/CSS assets - Cache First but with revision validation
          {
            urlPattern: /\.(?:js|css)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "static-resources",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Supabase API - Network First
          {
            urlPattern: /^https:\/\/ffvznjlnjxajrsgptijk\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
