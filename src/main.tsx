import { createRoot } from "react-dom/client";
import "./index.css";

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

function ensureSafeLocalStorage() {
  if (typeof window === "undefined") return;

  try {
    const testKey = "__tv_storage_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
  } catch {
    const fallbackStorage = createMemoryStorage();

    try {
      Object.defineProperty(window, "localStorage", {
        value: fallbackStorage,
        configurable: true,
      });
    } catch {
      const originalGetItem = Storage.prototype.getItem;
      const originalSetItem = Storage.prototype.setItem;
      const originalRemoveItem = Storage.prototype.removeItem;
      const originalClear = Storage.prototype.clear;

      Storage.prototype.getItem = function (key: string) {
        try {
          return originalGetItem.call(this, key);
        } catch {
          return fallbackStorage.getItem(key);
        }
      };

      Storage.prototype.setItem = function (key: string, value: string) {
        try {
          originalSetItem.call(this, key, value);
        } catch {
          fallbackStorage.setItem(key, value);
        }
      };

      Storage.prototype.removeItem = function (key: string) {
        try {
          originalRemoveItem.call(this, key);
        } catch {
          fallbackStorage.removeItem(key);
        }
      };

      Storage.prototype.clear = function () {
        try {
          originalClear.call(this);
        } catch {
          fallbackStorage.clear();
        }
      };
    }
  }
}

async function bootstrap() {
  if (import.meta.env.DEV) {
    console.log("[Main] Iniciando aplicação React", {
      timestamp: new Date().toISOString(),
      mode: import.meta.env.MODE,
    });
  }

  const rootElement = document.getElementById("root");

  if (!rootElement) {
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0a;color:#fff;font-family:system-ui;">
        <div style="text-align:center;">
          <h1>Erro de Inicialização</h1>
          <p>Elemento root não encontrado. Recarregue a página.</p>
        </div>
      </div>
    `;
    return;
  }

  ensureSafeLocalStorage();
  const { default: App } = await import("./App.tsx");
  const { StrictMode } = await import("react");

  const AppWrapper = import.meta.env.DEV
    ? () => <StrictMode><App /></StrictMode>
    : App;

  createRoot(rootElement).render(<AppWrapper />);

  if (import.meta.env.DEV) {
    console.log("[Main] React montado com sucesso");
  }
}

void bootstrap();
