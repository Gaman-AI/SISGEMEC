import React from "react";
import { supabase } from "@/lib/supabase";
import type { Profile, UserRole } from "./auth.types";

export type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; profile: Profile };

type Ctx = {
  state: AuthState;
  signIn(email: string, password: string): Promise<{ ok: boolean; error?: string }>;
  signOut(): Promise<void>;
};

const AuthContext = React.createContext<Ctx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({ status: "loading" });

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (mounted) setState({ status: "unauthenticated" });
          return;
        }
        // Obtener perfil
        const userId = session.user.id;
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, role, active")
          .eq("user_id", userId)
          .maybeSingle();
        if (error || !data) {
          if (mounted) setState({ status: "unauthenticated" });
          return;
        }
        const role = (data.role || "").toUpperCase();
        
        // Validar que solo ADMIN puede acceder al sistema
        if (role !== "ADMIN") {
          // Limpia cualquier sesión local y marca como no autenticado
          await supabase.auth.signOut();
          if (mounted) setState({ status: "unauthenticated" });
          return;
        }
        
        const profile: Profile = {
          user_id: data.user_id,
          full_name: data.full_name ?? null,
          email: data.email ?? null,
          role: role as UserRole,
          active: !!data.active,
        };
        if (mounted) setState({ status: "authenticated", profile });
      } catch {
        if (mounted) setState({ status: "unauthenticated" });
      }
    })();

    // Suscripción a cambios de sesión
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (!mounted) return; // Evitar setState después de unmount
        
        if (!session) {
          setState({ status: "unauthenticated" });
          return;
        }

        const userId = session.user.id;
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, role, active")
          .eq("user_id", userId)
          .maybeSingle();
        
        if (!mounted) return; // Verificar nuevamente después de async

        // Si hay error en el fetch, no quedarse en loading
        if (error) {
          console.warn('[AuthProvider] Error fetching profile in onAuthStateChange:', error);
          // Si el estado actual es "loading", mejor marcar unauthenticated que quedarse bloqueado
          if (state.status === "loading") {
            setState({ status: "unauthenticated" });
          }
          // Si ya estaba authenticated, mantener el estado actual (no romper la sesión por un error puntual)
          return;
        }

        if (!data) {
          setState({ status: "unauthenticated" });
          return;
        }

        const role = (data.role || "").toUpperCase();
        
        // Validar que solo ADMIN puede acceder al sistema
        if (role !== "ADMIN") {
          // Limpia cualquier sesión local y marca como no autenticado
          await supabase.auth.signOut();
          if (mounted) setState({ status: "unauthenticated" });
          return;
        }
        
        setState({
          status: "authenticated",
          profile: {
            user_id: data.user_id,
            full_name: data.full_name ?? null,
            email: data.email ?? null,
            role: role as UserRole,
            active: !!data.active,
          },
        });
      } catch (err) {
        console.error('[AuthProvider] onAuthStateChange error:', err);
        // Si no hay sesión, marcar unauthenticated
        if (!session) {
          if (mounted) setState({ status: "unauthenticated" });
        } else {
          // Si hay sesión pero hubo error, no dejar en "loading"
          // Mejor sacar al login que dejar la app bloqueada
          if (state.status === "loading") {
            if (mounted) setState({ status: "unauthenticated" });
          }
          // Si ya estaba authenticated, mantener estado actual
        }
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Watchdog: Si el estado es "loading" por más de 10 segundos, forzar resolución
  React.useEffect(() => {
    if (state.status !== "loading") return;
    
    const timer = setTimeout(() => {
      console.warn('[AuthProvider] Estado "loading" por más de 10s, verificando sesión...');
      (async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            setState({ status: "unauthenticated" });
          }
          // Si hay sesión, onAuthStateChange lo manejará
        } catch (err) {
          console.error('[AuthProvider] Error verificando sesión en watchdog:', err);
          // En caso de error, mejor marcar como unauthenticated que quedarse en loading
          setState({ status: "unauthenticated" });
        }
      })();
    }, 10000); // 10 segundos
    
    return () => clearTimeout(timer);
  }, [state.status]);

  async function signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error || !data.user) {
        return { ok: false, error: error?.message ?? "No se pudo iniciar sesión." };
      }

      // Después de autenticar, verificar que el usuario sea ADMIN
      // El onAuthStateChange se encargará de obtener el perfil y validar el rol
      // Si no es ADMIN, el onAuthStateChange lo marcará como unauthenticated
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "Error inesperado al iniciar sesión." };
    }
  }
  async function signOut() {
    await supabase.auth.signOut();
    setState({ status: "unauthenticated" });
  }

  return (
    <AuthContext.Provider value={{ state, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}