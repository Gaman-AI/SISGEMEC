import * as React from "react";
import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { supabase } from "@/lib/supabase";

export default function AppLayout() {
  const { collapsed } = useSidebar();

  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState !== "visible") return;
      
      try {
        // Timeout de seguridad para evitar colgarse
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("getSession timeout (visibilitychange)")), 5000)
        );
        
        await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise,
        ]);
      } catch (err) {
        console.debug("[AppLayout] visibilitychange getSession error:", err);
        // No cambiamos ningún estado global aquí, solo log
        // onAuthStateChange se encarga si algo serio pasa.
      }
    };
    
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

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

