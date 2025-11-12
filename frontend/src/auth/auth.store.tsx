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
      if (!mounted) return; // Evitar setState después de unmount
      
      if (!session) {
        setState({ status: "unauthenticated" });
      } else {
        const userId = session.user.id;
        const { data } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, role, active")
          .eq("user_id", userId)
          .maybeSingle();
        
        if (!mounted) return; // Verificar nuevamente después de async
        if (!data) {
          setState({ status: "unauthenticated" });
        } else {
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
        }
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

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