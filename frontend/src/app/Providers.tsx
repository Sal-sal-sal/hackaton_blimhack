import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { store } from "@/store";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeInitializer } from "@/app/ThemeInitializer";
import { Toaster } from "sonner";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ThemeInitializer />
        <BrowserRouter>
          {children}
          <Toaster richColors position="bottom-right" />
        </BrowserRouter>
      </Provider>
    </ErrorBoundary>
  );
}
