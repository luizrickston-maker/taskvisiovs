import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Boot marker global
if (import.meta.env.DEV) {
  console.log('[Main] Iniciando aplicação React', { 
    timestamp: new Date().toISOString(),
    mode: import.meta.env.MODE 
  });
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  // Fallback visual caso o root não exista
  document.body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0a;color:#fff;font-family:system-ui;">
      <div style="text-align:center;">
        <h1>Erro de Inicialização</h1>
        <p>Elemento root não encontrado. Recarregue a página.</p>
      </div>
    </div>
  `;
} else {
  createRoot(rootElement).render(<App />);
  
  if (import.meta.env.DEV) {
    console.log('[Main] React montado com sucesso');
  }
}
