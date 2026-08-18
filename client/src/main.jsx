import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { AutenticacaoProvider } from "./AutenticacaoContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AutenticacaoProvider>
      <App />
    </AutenticacaoProvider>
  </StrictMode>,
);
