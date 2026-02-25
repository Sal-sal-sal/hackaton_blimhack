import { NavLink } from "react-router-dom";
import { LayoutDashboard, Settings, UserCircle, X, PanelLeftClose, PanelLeftOpen, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAppSelector, useAppDispatch } from "@/store";
import { setSidebarOpen, toggleSidebarCollapsed } from "@/features/ui/uiSlice";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/chat", icon: MessageSquare, label: "Chat" },
  { to: "/profile", icon: UserCircle, label: "Profile" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const open = useAppSelector((s) => s.ui.sidebarOpen);
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const dispatch = useAppDispatch();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => dispatch(setSidebarOpen(false))}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300 lg:static",
          // Mobile: slide in/out
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          // Desktop: wide or collapsed
          collapsed ? "lg:w-16" : "lg:w-64",
          "w-64",
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between border-b px-4">
          {!collapsed && <span className="text-lg font-bold">HackApp</span>}
          {collapsed && <span className="mx-auto text-lg font-bold">H</span>}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => dispatch(setSidebarOpen(false))}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <Separator />

        {/* Nav */}
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => dispatch(setSidebarOpen(false))}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  "flex items-center rounded-md text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                  collapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden border-t p-2 lg:block">
          <Button
            variant="ghost"
            size="icon"
            className="w-full"
            onClick={() => dispatch(toggleSidebarCollapsed())}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>
    </>
  );
}
