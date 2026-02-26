import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { cn } from "@/lib/utils";

export function Layout() {
  const { pathname } = useLocation();
  const isChatPage = pathname === "/chat";
  const isSwipePage = pathname === "/swipe";
  const isImmersive = isChatPage || isSwipePage;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar forcedCollapsed={isImmersive} />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Hide header on mobile for swipe page; always hide for chat */}
        {!isChatPage && !(isSwipePage) && <Header />}
        <main
          className={cn(
            "flex-1 overflow-y-auto",
            isImmersive ? "p-0" : "p-4 lg:p-6",
          )}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
