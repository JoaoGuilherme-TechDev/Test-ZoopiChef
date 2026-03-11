// vite.config.ts
import { defineConfig } from "file:///C:/codes/project_zoopi/zoopi-frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/codes/project_zoopi/zoopi-frontend/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///C:/codes/project_zoopi/zoopi-frontend/node_modules/lovable-tagger/dist/index.js";
import { VitePWA } from "file:///C:/codes/project_zoopi/zoopi-frontend/node_modules/vite-plugin-pwa/dist/index.js";
var __vite_injected_original_dirname = "C:\\codes\\project_zoopi\\zoopi-frontend";
var buildTimestamp = Date.now().toString();
var vite_config_default = defineConfig(({ mode }) => ({
  // Injeta variáveis de ambiente de build
  define: {
    "import.meta.env.VITE_BUILD_TIMESTAMP": JSON.stringify(buildTimestamp),
    "import.meta.env.VITE_BUILD_VERSION": JSON.stringify(`v${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}`)
  },
  server: {
    host: "::",
    port: 8080,
    // CONFIGURAÇÃO DE PROXY: Resolve o erro 404 nas chamadas de API
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        // Alinhado com seu README (NestJS)
        changeOrigin: true,
        secure: false,
        rewrite: (path2) => path2
        // Mantém o prefixo /api conforme seu padrão Nest
      }
    }
  },
  // Configuração de build com cache busting nos nomes dos arquivos
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash]-${buildTimestamp.slice(-6)}.js`,
        chunkFileNames: `assets/[name]-[hash]-${buildTimestamp.slice(-6)}.js`,
        assetFileNames: `assets/[name]-[hash]-${buildTimestamp.slice(-6)}.[ext]`
      }
    }
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
        description: "Sistema de Gest\xE3o para Restaurantes - Zoopi Tecnologia",
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
            purpose: "any"
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
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
                maxAgeSeconds: 60
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              networkTimeoutSeconds: 3
            }
          },
          // Cache para recursos estáticos
          {
            urlPattern: /\.(?:js|css)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "static-resources",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Estratégia para chamadas de API (Prioriza rede, mas aceita cache se offline)
          {
            urlPattern: /\/api\/.*/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24
              },
              networkTimeoutSeconds: 5
            }
          }
        ]
      },
      // Habilita o PWA em modo de desenvolvimento para evitar erros de 404/Syntax no manifest
      devOptions: {
        enabled: true,
        type: "module",
        navigateFallback: "index.html"
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxjb2Rlc1xcXFxwcm9qZWN0X3pvb3BpXFxcXHpvb3BpLWZyb250ZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxjb2Rlc1xcXFxwcm9qZWN0X3pvb3BpXFxcXHpvb3BpLWZyb250ZW5kXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9jb2Rlcy9wcm9qZWN0X3pvb3BpL3pvb3BpLWZyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSBcImxvdmFibGUtdGFnZ2VyXCI7XHJcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tIFwidml0ZS1wbHVnaW4tcHdhXCI7XHJcblxyXG4vLyBHZXJhZG9yIGRlIHRpbWVzdGFtcCBwYXJhIGV2aXRhciBjYWNoZSBhbnRpZ28gbm8gYnVpbGRcclxuY29uc3QgYnVpbGRUaW1lc3RhbXAgPSBEYXRlLm5vdygpLnRvU3RyaW5nKCk7XHJcblxyXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xyXG4gIC8vIEluamV0YSB2YXJpXHUwMEUxdmVpcyBkZSBhbWJpZW50ZSBkZSBidWlsZFxyXG4gIGRlZmluZToge1xyXG4gICAgJ2ltcG9ydC5tZXRhLmVudi5WSVRFX0JVSUxEX1RJTUVTVEFNUCc6IEpTT04uc3RyaW5naWZ5KGJ1aWxkVGltZXN0YW1wKSxcclxuICAgICdpbXBvcnQubWV0YS5lbnYuVklURV9CVUlMRF9WRVJTSU9OJzogSlNPTi5zdHJpbmdpZnkoYHYke25ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5zbGljZSgwLCAxMCl9YCksXHJcbiAgfSxcclxuICBzZXJ2ZXI6IHtcclxuICAgIGhvc3Q6IFwiOjpcIixcclxuICAgIHBvcnQ6IDgwODAsXHJcbiAgICAvLyBDT05GSUdVUkFcdTAwQzdcdTAwQzNPIERFIFBST1hZOiBSZXNvbHZlIG8gZXJybyA0MDQgbmFzIGNoYW1hZGFzIGRlIEFQSVxyXG4gICAgcHJveHk6IHtcclxuICAgICAgJy9hcGknOiB7XHJcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDozMDAwJywgLy8gQWxpbmhhZG8gY29tIHNldSBSRUFETUUgKE5lc3RKUylcclxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXHJcbiAgICAgICAgc2VjdXJlOiBmYWxzZSxcclxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aCAvLyBNYW50XHUwMEU5bSBvIHByZWZpeG8gL2FwaSBjb25mb3JtZSBzZXUgcGFkclx1MDBFM28gTmVzdFxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuICAvLyBDb25maWd1cmFcdTAwRTdcdTAwRTNvIGRlIGJ1aWxkIGNvbSBjYWNoZSBidXN0aW5nIG5vcyBub21lcyBkb3MgYXJxdWl2b3NcclxuICBidWlsZDoge1xyXG4gICAgcm9sbHVwT3B0aW9uczoge1xyXG4gICAgICBvdXRwdXQ6IHtcclxuICAgICAgICBlbnRyeUZpbGVOYW1lczogYGFzc2V0cy9bbmFtZV0tW2hhc2hdLSR7YnVpbGRUaW1lc3RhbXAuc2xpY2UoLTYpfS5qc2AsXHJcbiAgICAgICAgY2h1bmtGaWxlTmFtZXM6IGBhc3NldHMvW25hbWVdLVtoYXNoXS0ke2J1aWxkVGltZXN0YW1wLnNsaWNlKC02KX0uanNgLFxyXG4gICAgICAgIGFzc2V0RmlsZU5hbWVzOiBgYXNzZXRzL1tuYW1lXS1baGFzaF0tJHtidWlsZFRpbWVzdGFtcC5zbGljZSgtNil9LltleHRdYCxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfSxcclxuICBwbHVnaW5zOiBbXHJcbiAgICByZWFjdCgpLFxyXG4gICAgbW9kZSA9PT0gXCJkZXZlbG9wbWVudFwiICYmIGNvbXBvbmVudFRhZ2dlcigpLFxyXG4gICAgVml0ZVBXQSh7XHJcbiAgICAgIHJlZ2lzdGVyVHlwZTogXCJhdXRvVXBkYXRlXCIsXHJcbiAgICAgIGluY2x1ZGVBc3NldHM6IFtcImZhdmljb24uaWNvXCIsIFwicm9ib3RzLnR4dFwiLCBcInB3YS0xOTJ4MTkyLnBuZ1wiLCBcInB3YS01MTJ4NTEyLnBuZ1wiXSxcclxuICAgICAgbWFuaWZlc3Q6IHtcclxuICAgICAgICBuYW1lOiBcIlpvb3BpXCIsXHJcbiAgICAgICAgc2hvcnRfbmFtZTogXCJab29waVwiLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiBcIlNpc3RlbWEgZGUgR2VzdFx1MDBFM28gcGFyYSBSZXN0YXVyYW50ZXMgLSBab29waSBUZWNub2xvZ2lhXCIsXHJcbiAgICAgICAgdGhlbWVfY29sb3I6IFwiIzYzNjZmMVwiLFxyXG4gICAgICAgIGJhY2tncm91bmRfY29sb3I6IFwiIzBhMGEwYVwiLFxyXG4gICAgICAgIGRpc3BsYXk6IFwic3RhbmRhbG9uZVwiLFxyXG4gICAgICAgIG9yaWVudGF0aW9uOiBcInBvcnRyYWl0XCIsXHJcbiAgICAgICAgc2NvcGU6IFwiL1wiLFxyXG4gICAgICAgIHN0YXJ0X3VybDogXCIvXCIsXHJcbiAgICAgICAgaWQ6IFwiem9vcGktbWFpblwiLFxyXG4gICAgICAgIGljb25zOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHNyYzogXCIvcHdhLTE5MngxOTIucG5nXCIsXHJcbiAgICAgICAgICAgIHNpemVzOiBcIjE5MngxOTJcIixcclxuICAgICAgICAgICAgdHlwZTogXCJpbWFnZS9wbmdcIixcclxuICAgICAgICAgICAgcHVycG9zZTogXCJhbnlcIixcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHNyYzogXCIvcHdhLTUxMng1MTIucG5nXCIsXHJcbiAgICAgICAgICAgIHNpemVzOiBcIjUxMng1MTJcIixcclxuICAgICAgICAgICAgdHlwZTogXCJpbWFnZS9wbmdcIixcclxuICAgICAgICAgICAgcHVycG9zZTogXCJhbnlcIixcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHNyYzogXCIvcHdhLW1hc2thYmxlLTUxMng1MTIucG5nXCIsXHJcbiAgICAgICAgICAgIHNpemVzOiBcIjUxMng1MTJcIixcclxuICAgICAgICAgICAgdHlwZTogXCJpbWFnZS9wbmdcIixcclxuICAgICAgICAgICAgcHVycG9zZTogXCJtYXNrYWJsZVwiLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9LFxyXG4gICAgICB3b3JrYm94OiB7XHJcbiAgICAgICAgZ2xvYlBhdHRlcm5zOiBbXCIqKi8qLntqcyxjc3MsaWNvLHBuZyxzdmcsd29mZjJ9XCJdLFxyXG4gICAgICAgIG1heGltdW1GaWxlU2l6ZVRvQ2FjaGVJbkJ5dGVzOiA4ICogMTAyNCAqIDEwMjQsXHJcbiAgICAgICAgY2xlYW51cE91dGRhdGVkQ2FjaGVzOiB0cnVlLFxyXG4gICAgICAgIHNraXBXYWl0aW5nOiB0cnVlLFxyXG4gICAgICAgIGNsaWVudHNDbGFpbTogdHJ1ZSxcclxuICAgICAgICBydW50aW1lQ2FjaGluZzogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAoeyByZXF1ZXN0IH0pID0+IHJlcXVlc3QubW9kZSA9PT0gXCJuYXZpZ2F0ZVwiLFxyXG4gICAgICAgICAgICBoYW5kbGVyOiBcIk5ldHdvcmtGaXJzdFwiLFxyXG4gICAgICAgICAgICBvcHRpb25zOiB7XHJcbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiBcImh0bWwtY2FjaGVcIixcclxuICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XHJcbiAgICAgICAgICAgICAgICBtYXhFbnRyaWVzOiAxMCxcclxuICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDYwLFxyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgY2FjaGVhYmxlUmVzcG9uc2U6IHtcclxuICAgICAgICAgICAgICAgIHN0YXR1c2VzOiBbMCwgMjAwXSxcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgIG5ldHdvcmtUaW1lb3V0U2Vjb25kczogMyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICAvLyBDYWNoZSBwYXJhIHJlY3Vyc29zIGVzdFx1MDBFMXRpY29zXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9cXC4oPzpqc3xjc3MpJC8sXHJcbiAgICAgICAgICAgIGhhbmRsZXI6IFwiQ2FjaGVGaXJzdFwiLFxyXG4gICAgICAgICAgICBvcHRpb25zOiB7XHJcbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiBcInN0YXRpYy1yZXNvdXJjZXNcIixcclxuICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XHJcbiAgICAgICAgICAgICAgICBtYXhFbnRyaWVzOiAxMDAsXHJcbiAgICAgICAgICAgICAgICBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQsXHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICBjYWNoZWFibGVSZXNwb25zZToge1xyXG4gICAgICAgICAgICAgICAgc3RhdHVzZXM6IFswLCAyMDBdLFxyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgLy8gRXN0cmF0XHUwMEU5Z2lhIHBhcmEgY2hhbWFkYXMgZGUgQVBJIChQcmlvcml6YSByZWRlLCBtYXMgYWNlaXRhIGNhY2hlIHNlIG9mZmxpbmUpXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9cXC9hcGlcXC8uKi8sXHJcbiAgICAgICAgICAgIGhhbmRsZXI6IFwiTmV0d29ya0ZpcnN0XCIsXHJcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcclxuICAgICAgICAgICAgICBjYWNoZU5hbWU6IFwiYXBpLWNhY2hlXCIsXHJcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xyXG4gICAgICAgICAgICAgICAgbWF4RW50cmllczogMTAwLFxyXG4gICAgICAgICAgICAgICAgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0LFxyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgbmV0d29ya1RpbWVvdXRTZWNvbmRzOiA1LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0sXHJcbiAgICAgIC8vIEhhYmlsaXRhIG8gUFdBIGVtIG1vZG8gZGUgZGVzZW52b2x2aW1lbnRvIHBhcmEgZXZpdGFyIGVycm9zIGRlIDQwNC9TeW50YXggbm8gbWFuaWZlc3RcclxuICAgICAgZGV2T3B0aW9uczoge1xyXG4gICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgdHlwZTogJ21vZHVsZScsXHJcbiAgICAgICAgbmF2aWdhdGVGYWxsYmFjazogJ2luZGV4Lmh0bWwnLFxyXG4gICAgICB9LFxyXG4gICAgfSlcclxuICBdLmZpbHRlcihCb29sZWFuKSxcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcclxuICAgIH0sXHJcbiAgfSxcclxufSkpOyJdLAogICJtYXBwaW5ncyI6ICI7QUFBeVMsU0FBUyxvQkFBb0I7QUFDdFUsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLHVCQUF1QjtBQUNoQyxT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
