import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/styles/globals.css";
import { Providers } from "@/app/Providers";
import { AppRouter } from "@/app/AppRouter";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Providers>
      <AppRouter />
    </Providers>
  </StrictMode>,
);
