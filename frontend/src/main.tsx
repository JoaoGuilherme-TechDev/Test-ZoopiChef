import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeVersionCheck, setupServiceWorkerListener, getBuildInfo } from "@/lib/pwa/versionManager";
import { disablePreviewCaching, isPreviewEnvironment } from "@/lib/pwa/previewNoCache";

// Log build info for debugging
console.log('[Zoopi] Build Info:', getBuildInfo());

function disableZoom() {
  // Desktop: Ctrl/Cmd + wheel zoom
  window.addEventListener(
    "wheel",
    (e) => {
      if ((e as WheelEvent).ctrlKey || (e as WheelEvent).metaKey) e.preventDefault();
    },
    { passive: false }
  );

  // Mobile: pinch zoom
  document.addEventListener(
    "touchmove",
    (e) => {
      const te = e as TouchEvent;
      if (te.touches && te.touches.length > 1) e.preventDefault();
    },
    { passive: false }
  );

  // Mobile: double-tap / double-click zoom
  document.addEventListener(
    "dblclick",
    (e) => {
      e.preventDefault();
    },
    { passive: false }
  );

  // iOS Safari gesture events (no-op on Android)
  document.addEventListener(
    "gesturestart" as any,
    (e: any) => {
      e.preventDefault?.();
    },
    { passive: false } as any
  );
}

disableZoom();

async function bootstrap() {
  try {
    // Preview must always show the latest build: disable SW + caches.
    await disablePreviewCaching();

    // Only keep SW/version orchestration outside preview.
    if (!isPreviewEnvironment()) {
      setupServiceWorkerListener();
      initializeVersionCheck();
    }

    createRoot(document.getElementById("root")!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (err) {
    console.error('Bootstrap failed:', err);
    // Render a fallback UI
    const root = document.getElementById("root");
    if (root) {
      root.innerHTML = `<div style="padding: 20px; color: red;"><h1>System Error</h1><pre>${err}</pre></div>`;
    }
  }
}

bootstrap();

