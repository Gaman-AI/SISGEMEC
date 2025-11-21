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
  // DEPRECATED: enlaces a módulos antiguos de servicios/solicitudes removidos del menú.
  // { label: "Servicios", to: "/servicios", icon: Wrench },
  // { label: "Solicitudes", to: "/solicitudes", icon: FileText },
  { label: "Tickets", to: "/tickets", icon: Ticket },
  { label: "Reportes", to: "/reportes", icon: BarChart3 },
  { label: "Importar", to: "/import", icon: Upload },
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
  
  // Solo ADMIN puede acceder al sistema (validado en auth.store)
  const navItems = isAdmin ? ADMIN_NAV_ITEMS : [];

  return (
    <aside
      className={cn(
        // fondo corporativo
        "flex flex-col h-dvh border-r border-[#164F5B]/30 bg-[#208692] text-white",
        collapsed ? "w-[80px]" : "w-64",
        "transition-[width] duration-200 ease-in-out sticky top-0"
      )}
    >
      <div className={cn(
        "flex items-center h-14",
        collapsed ? "justify-center px-2" : "justify-between px-4"
      )}>
        <Brand compact={collapsed} />
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggle} 
          aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          className={cn(
            "h-9 w-9 rounded-full text-white hover:bg-white/15 transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#208692]",
            !collapsed && "ml-auto"
          )}
        >
          <ChevronsLeft className={cn(
            "h-4 w-4 transition-transform duration-200",
            collapsed && "rotate-180"
          )} />
        </Button>
      </div>

      <Separator className="bg-white/20" />

      <TooltipProvider delayDuration={100}>
        <nav className={cn(
          "flex-1 overflow-y-auto pb-4",
          collapsed 
            ? "flex flex-col items-center gap-4 px-2 py-3" 
            : "flex flex-col px-3 py-4 space-y-2"
        )}>
          <div className={cn(collapsed ? "flex flex-col items-center gap-4 w-full" : "space-y-1")}>
            {navItems.map(({ label, to, icon: Icon }) => {
              const item = (
                <NavLink
                  key={to}
                  to={to}
                  onClick={handleNavClick}
                  aria-label={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center rounded-xl transition-colors duration-200 cursor-pointer",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#208692]",
                      collapsed 
                        ? "px-2 py-3.5 justify-center gap-0" 
                        : "px-4 py-2.5 gap-3",
                      !isActive && "text-white/90",
                      isActive && "text-white",
                      collapsed
                        ? isActive 
                          ? "bg-white/25" 
                          : "hover:bg-white/15"
                        : isActive
                          ? "bg-white/25 relative before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:rounded-full before:bg-white/60"
                          : "hover:bg-white/15"
                    )
                  }
                >
                  <Icon className={cn(
                    "h-5 w-5 shrink-0",
                    collapsed && "mx-auto"
                  )} />
                  {!collapsed && (
                    <span className="text-sm font-semibold truncate">{label}</span>
                  )}
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
          </div>
          
          {/* Licencias condicionales por feature flag */}
          {ffOn && isAuthenticated(state) && state.profile.role === 'ADMIN' && (
            <div className={cn(collapsed ? "flex flex-col items-center gap-4 w-full" : "space-y-1")}>
              {(() => {
                const licensesItem = (
                  <NavLink
                    to="/licenses"
                    onClick={handleNavClick}
                    aria-label={collapsed ? "Licencias" : undefined}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center rounded-xl transition-colors duration-200 cursor-pointer",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#208692]",
                        collapsed 
                          ? "px-2 py-3.5 justify-center gap-0" 
                          : "px-4 py-2.5 gap-3",
                        !isActive && "text-white/90",
                        isActive && "text-white",
                        collapsed
                          ? isActive 
                            ? "bg-white/25" 
                            : "hover:bg-white/15"
                          : isActive
                            ? "bg-white/25 relative before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:rounded-full before:bg-white/60"
                            : "hover:bg-white/15"
                      )
                    }
                  >
                    <FileText className={cn(
                      "h-5 w-5 shrink-0",
                      collapsed && "mx-auto"
                    )} />
                    {!collapsed && (
                      <span className="text-sm font-semibold truncate">Licencias</span>
                    )}
                  </NavLink>
                );
                return collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{licensesItem}</TooltipTrigger>
                    <TooltipContent side="right">Licencias</TooltipContent>
                  </Tooltip>
                ) : licensesItem;
              })()}
              {!collapsed && (
                <div className="ml-4 space-y-1">
                  <NavLink
                    to="/licenses/vendors"
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#208692]",
                        !isActive && "text-white/90",
                        isActive ? "bg-white/15 text-white" : "hover:bg-white/10 hover:text-white"
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
                        "flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#208692]",
                        !isActive && "text-white/90",
                        isActive ? "bg-white/15 text-white" : "hover:bg-white/10 hover:text-white"
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
                        "flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#208692]",
                        !isActive && "text-white/90",
                        isActive ? "bg-white/15 text-white" : "hover:bg-white/10 hover:text-white"
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
                        "flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#208692]",
                        !isActive && "text-white/90",
                        isActive ? "bg-white/15 text-white" : "hover:bg-white/10 hover:text-white"
                      )
                    }
                  >
                    <span className="text-xs">•</span>
                    <span className="truncate">Asignaciones</span>
                  </NavLink>
                </div>
              )}
            </div>
          )}
          
          {/* Separador antes del logout */}
          <div className="my-2">
            <Separator className="bg-white/20" />
          </div>
          
          {/* Botón de logout */}
          <div className={cn(collapsed ? "px-2 w-full flex justify-center" : "px-3")}>
            {(() => {
              const logoutButton = (
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  aria-label={collapsed ? "Cerrar sesión" : undefined}
                  className={cn(
                    "flex items-center rounded-xl transition-colors duration-200 cursor-pointer",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#208692]",
                    collapsed 
                      ? "px-2 py-3.5 justify-center gap-0" 
                      : "w-full px-4 py-2.5 justify-start gap-3",
                    "text-white/90 hover:bg-white/15 hover:text-white text-sm font-medium"
                  )}
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  {!collapsed && (
                    <span className="truncate">Cerrar sesión</span>
                  )}
                </Button>
              );
              return collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>{logoutButton}</TooltipTrigger>
                  <TooltipContent side="right">Cerrar sesión</TooltipContent>
                </Tooltip>
              ) : logoutButton;
            })()}
          </div>
        </nav>
      </TooltipProvider>
    </aside>
  );
}

