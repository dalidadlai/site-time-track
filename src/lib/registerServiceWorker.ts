import { registerSW } from "virtual:pwa-register";

const PREVIEW_LABEL = /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/;

function isRefusedContext(): boolean {
  if (!import.meta.env.PROD) return true;
  try { if (window.self !== window.top) return true; } catch { return true; }
  const host = window.location.hostname.toLowerCase();
  const label = host.split(".")[0];
  const lovableHost = /\.(lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(host);
  if (lovableHost && (PREVIEW_LABEL.test(label) || /^project--.+-dev$/.test(label))) return true;
  if (/(^|\.)lovableproject(-dev)?\.com$/.test(host) || /(^|\.)beta\.lovable\.dev$/.test(host)) return true;
  return new URLSearchParams(window.location.search).get("sw") === "off";
}

async function unregisterAppWorkers() {
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.filter(r => [r.active, r.waiting, r.installing].some(w => w?.scriptURL.endsWith("/sw.js"))).map(r => r.unregister()));
}

/** Only registrar for the app service worker; keeps installed copies on the newest release. */
export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (isRefusedContext()) { unregisterAppWorkers().catch(() => undefined); return; }
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => { if (navigator.onLine) registration.update().catch(() => undefined); };
      setInterval(check, 60 * 60 * 1000);
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") check(); });
    },
  });
}
