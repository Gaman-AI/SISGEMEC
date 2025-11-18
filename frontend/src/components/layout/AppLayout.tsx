import * as React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { useAuth } from "@/auth/auth.store";

// Contador de renders para debugging
let renderCount = 0;

function AppLayout() {
  const { collapsed } = useSidebar();
  const { state } = useAuth();

  // Log de renders para confirmar que se redujo la frecuencia
  React.useEffect(() => {
    console.log('[AppLayout] Render #' + (++renderCount) + ', auth.status =', state.status);
  });

  return (
    <div className="flex">
      <Sidebar />
      <div className={cn("flex min-h-dvh flex-1 flex-col")}>
        <Topbar />
        <main className="flex-1 p-4">
          <div className="mx-auto w-full max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

// ✅ Memorizar AppLayout para evitar re-renders innecesarios
// Solo re-renderizar si collapsed cambia (sidebar) o si auth.status cambia
export default React.memo(AppLayout, (prevProps, nextProps) => {
  // AppLayout no recibe props, así que siempre es "igual"
  // Dejamos que los hooks internos manejen sus propios cambios
  return true; // No re-renderizar por cambios de props (no hay props)
});

