import * as React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { useAuth } from "@/auth/auth.store";
import { isAuthenticated } from "@/auth/guards";
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
  Upload,
  BarChart3,
  Ticket,
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
  { label: "Tickets", to: "/tickets", icon: Ticket },
  { label: "Reportes", to: "/reportes", icon: BarChart3 },
  { label: "Importar", to: "/import", icon: Upload },
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
  if (!isAuthenticated(state)) {
    return null;
  }

  // A partir de aquí TypeScript sabe que state.profile existe
  const ffOn = import.meta.env.VITE_FEATURE_LICENSES === 'true';
  const authenticatedState = state as Extract<typeof state, { status: 'authenticated' }>;
  const isAdmin = authenticatedState.profile.role === "ADMIN";
  const isResponsable = authenticatedState.profile.role === "RESPONSABLE";
  
  const navItems = isAdmin ? ADMIN_NAV_ITEMS : RESPONSABLE_NAV_ITEMS;

  return (
    <aside
      className={cn(
        // fondo corporativo
        "h-dvh border-r bg-[#317b86] text-white",
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
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-white",
                    "hover:bg-white/20 hover:text-white transition-colors",
                    isActive && "bg-white/20 text-white"
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
          
          {/* Licencias condicionales por feature flag */}
          {ffOn && isAuthenticated(state) && state.profile.role === 'ADMIN' && (
            <>
              <NavLink
                to="/licenses"
                onClick={handleNavClick}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-white",
                    "hover:bg-white/20 hover:text-white transition-colors",
                    isActive && "bg-white/20 text-white"
                  )
                }
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span className={cn("truncate", collapsed && "sr-only")}>Licencias</span>
              </NavLink>
              <div className={cn("ml-4 space-y-1", collapsed && "hidden")}>
                <NavLink
                  to="/licenses/vendors"
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-white/80",
                      "hover:bg-white/10 hover:text-white transition-colors",
                      isActive && "bg-white/10 text-white"
                    )
                  }
                >
                  <span className="text-xs">•</span>
                  <span className="truncate">Proveedores</span>
                </NavLink>
                <NavLink
                  to="/licenses/products"
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-white/80",
                      "hover:bg-white/10 hover:text-white transition-colors",
                      isActive && "bg-white/10 text-white"
                    )
                  }
                >
                  <span className="text-xs">•</span>
                  <span className="truncate">Productos</span>
                </NavLink>
                <NavLink
                  to="/licenses/plans"
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-white/80",
                      "hover:bg-white/10 hover:text-white transition-colors",
                      isActive && "bg-white/10 text-white"
                    )
                  }
                >
                  <span className="text-xs">•</span>
                  <span className="truncate">Planes</span>
                </NavLink>
                <NavLink
                  to="/licenses/assignments"
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-white/80",
                      "hover:bg-white/10 hover:text-white transition-colors",
                      isActive && "bg-white/10 text-white"
                    )
                  }
                >
                  <span className="text-xs">•</span>
                  <span className="truncate">Asignaciones</span>
                </NavLink>
              </div>
            </>
          )}
          
          {ffOn && isResponsable && (
            <NavLink
              to="/mis-licencias"
              onClick={handleNavClick}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-white",
                  "hover:bg-white/20 hover:text-white transition-colors",
                  isActive && "bg-white/20 text-white"
                )
              }
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span className={cn("truncate", collapsed && "sr-only")}>Mis Licencias</span>
            </NavLink>
          )}
          
          {/* Separador antes del logout */}
          <div className="my-2">
            <Separator />
          </div>
          
          {/* Botón de logout */}
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={cn(
              "w-full justify-start gap-3 px-3 py-2 text-sm text-white",
              "hover:bg-white/20 hover:text-white transition-colors"
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

