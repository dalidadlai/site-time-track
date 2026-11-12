import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Installed/cached copies must pick up new releases: check on open, when the app
// regains focus, and hourly; autoUpdate reloads once the new version takes over.
if ("serviceWorker" in navigator && !window.location.hostname.includes("id-preview--")) {
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => { if (navigator.onLine) registration.update().catch(() => undefined); };
      check();
      setInterval(check, 60 * 60 * 1000);
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") check(); });
    },
  });
}

createRoot(document.getElementById("root")!).render(<App />);
