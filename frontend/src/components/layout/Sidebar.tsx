import * as React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { useAuth } from "@/auth/auth.store";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Users,
  Laptop,
  ListChecks,
  Wrench,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  FileText,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Brand } from "@/components/common/Brand";

type NavItem = { label: string; to: string; icon: React.ComponentType<{ className?: string }> };

const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Usuarios", to: "/usuarios", icon: Users },
  { label: "Equipos", to: "/equipos", icon: Laptop },
  { label: "Tipos de Servicio", to: "/tipos-servicio", icon: ListChecks },
  { label: "Servicios", to: "/servicios", icon: Wrench },
  { label: "Solicitudes", to: "/solicitudes", icon: FileText },
];

const RESPONSABLE_NAV_ITEMS: NavItem[] = [
  { label: "Mis Equipos", to: "/mis-equipos", icon: Laptop },
  { label: "Mis Solicitudes", to: "/mis-solicitudes", icon: FileText },
];

export default function Sidebar() {
  const { collapsed, set, toggle } = useSidebar();
  const { state, signOut } = useAuth();
  const navigate = useNavigate();

  const handleNavClick = React.useCallback(() => {
    if (window.innerWidth < 1024) set(true);
  }, [set]);

  const handleLogout = React.useCallback(async () => {
    await signOut();
    navigate("/login", { replace: true });
  }, [signOut, navigate]);

  // No mostrar sidebar si no está autenticado
  if (state.status !== "authenticated") {
    return null;
  }

  const navItems = state.profile.role === "ADMIN" ? ADMIN_NAV_ITEMS : RESPONSABLE_NAV_ITEMS;

  return (
    <aside
      className={cn(
        // fondo slate fijo
        "h-dvh border-r bg-[hsl(var(--sidebar-bg))] text-foreground/90",
        collapsed ? "w-[80px]" : "w-64",
        "transition-[width] duration-200 ease-in-out sticky top-0"
      )}
    >
      <div className="flex h-14 items-center justify-between px-3">
        <Brand compact={collapsed} />
        <Button variant="ghost" size="icon" onClick={toggle} aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}>
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </Button>
      </div>

      <Separator />

      <TooltipProvider delayDuration={100}>
        <nav className="mt-2 px-2 space-y-1">
          {navItems.map(({ label, to, icon: Icon }) => {
            const item = (
              <NavLink
                key={to}
                to={to}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                    "hover:bg-accent hover:text-accent-foreground transition-colors",
                    isActive && "bg-accent text-accent-foreground"
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className={cn("truncate", collapsed && "sr-only")}>{label}</span>
              </NavLink>
            );
            return collapsed ? (
              <Tooltip key={to}>
                <TooltipTrigger asChild>{item}</TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            ) : (
              item
            );
          })}
          
          {/* Separador antes del logout */}
          <div className="my-2">
            <Separator />
          </div>
          
          {/* Botón de logout */}
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={cn(
              "w-full justify-start gap-3 px-3 py-2 text-sm",
              "hover:bg-accent hover:text-accent-foreground transition-colors"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className={cn("truncate", collapsed && "sr-only")}>Cerrar sesión</span>
          </Button>
        </nav>
      </TooltipProvider>
    </aside>
  );
}

