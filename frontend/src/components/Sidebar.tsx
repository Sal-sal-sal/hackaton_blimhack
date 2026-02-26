import { useState } from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Settings, UserCircle, X, PanelLeftClose, PanelLeftOpen, MessageSquare, Layers, Briefcase, Sparkles, Inbox, Building2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAppSelector, useAppDispatch } from "@/store";
import { setSidebarOpen, toggleSidebarCollapsed } from "@/features/ui/uiSlice";

const candidateNav = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/swipe", icon: Layers, label: "Вакансии" },
  { to: "/career-ai", icon: Sparkles, label: "AI Карьера" },
  { to: "/chat", icon: MessageSquare, label: "Chat" },
  { to: "/profile", icon: UserCircle, label: "Profile" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

const employerNav = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/my-jobs", icon: Briefcase, label: "Мои вакансии" },
  { to: "/applications", icon: Inbox, label: "Отклики" },
  { to: "/hh-vacancies", icon: Search, label: "Вакансии HH" },
  { to: "/company", icon: Building2, label: "Компания" },
  { to: "/chat", icon: MessageSquare, label: "Chat" },
  { to: "/profile", icon: UserCircle, label: "Profile" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar({ forcedCollapsed = false }: { forcedCollapsed?: boolean }) {
  const open = useAppSelector((s) => s.ui.sidebarOpen);
  const userCollapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const collapsed = forcedCollapsed || userCollapsed;
  const role = useAppSelector((s) => s.auth.user?.role);
  const dispatch = useAppDispatch();

  const [hovered, setHovered] = useState(false);

  // When forcedCollapsed (chat page), hovering expands the sidebar
  const showExpanded = !collapsed || (forcedCollapsed && hovered);

  const navItems = role === "employer" ? employerNav : candidateNav;

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
        onMouseEnter={() => forcedCollapsed && setHovered(true)}
        onMouseLeave={() => forcedCollapsed && setHovered(false)}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300 lg:static",
          // Mobile: slide in/out
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          // Desktop width: expanded ~330px (+30%), collapsed 72px (icons)
          showExpanded ? "lg:w-[330px]" : "lg:w-[72px]",
          // Mobile always full expanded width
          "w-[330px]",
          // When hovering on forced-collapsed, overlay on top of content
          forcedCollapsed && hovered && "lg:absolute lg:shadow-2xl lg:shadow-black/20",
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center border-b px-4">
          {showExpanded ? (
            <span className="text-lg font-bold">HackApp</span>
          ) : (
            <span className="mx-auto text-lg font-bold">H</span>
          )}
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => dispatch(setSidebarOpen(false))}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Nav */}
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => dispatch(setSidebarOpen(false))}
              title={!showExpanded ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  "flex items-center rounded-md text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                  showExpanded ? "gap-3 px-3 py-2.5" : "justify-center px-2 py-2.5",
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {showExpanded && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle (desktop only, hidden when forcedCollapsed) */}
        {!forcedCollapsed && (
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
        )}
      </aside>
    </>
  );
}
