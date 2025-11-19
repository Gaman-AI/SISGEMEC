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

// Helper para generar ID único de objeto (solo para debugging)
let stateIdCounter = 0;
const stateIds = new WeakMap<any, number>();
function getStateId(obj: any): number {
  if (!stateIds.has(obj)) {
    stateIds.set(obj, ++stateIdCounter);
  }
  return stateIds.get(obj)!;
}

// 🔬 EXPERIMENTO C: Contador de suscripciones a onAuthStateChange
let authSubscriptionCounter = 0;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  console.log('[EXPERIMENTO C] 🔁 Render de AuthProvider');
  console.log('[AuthProvider:render] Render inicial de AuthProvider (estado local aún no inicializado completamente)');
  // 🔬 EXPERIMENTO A2: Referencia para rastrear si ya procesamos el primer SIGNED_IN
  const hasHandledInitialSignInRef = React.useRef(false);
  const [state, setState] = React.useState<AuthState>({ status: "loading" });

  React.useEffect(() => {
    console.log('[AuthProvider:useEffect] Iniciando efecto de auth, timestamp =', Date.now());
    let mounted = true;
    (async () => {
      try {
        console.log('[AuthProvider:init] getSession() INICIADO, timestamp =', Date.now());
        console.log('[AuthProvider:init] Iniciando getSession()...');
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        console.log('[AuthProvider:init] getSession() COMPLETADO', {
          hasSession: !!sessionData?.session,
          error: sessionError,
          mounted,
        });
        console.log('[AuthProvider:init] getSession() completado', {
          hasSession: !!sessionData?.session,
          error: sessionError?.message ?? null,
        });
        if (sessionError || !sessionData?.session) {
          console.log('[AuthProvider:init] setState({ status: "unauthenticated" })', {
            reason: 'no-session-or-error',
          });
          if (mounted) setState({ status: "unauthenticated" });
          return;
        }
        const session = sessionData.session;
        // Obtener perfil
        const userId = session.user.id;
        console.log('[AuthProvider:init] Consultando profiles DESDE getSession() para user_id =', userId, 'mounted =', mounted);
        console.log('[AuthProvider:init] Consultando profiles para user_id =', userId);
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, role, active")
          .eq("user_id", userId)
          .maybeSingle();
        console.log('[AuthProvider:init] Profiles DESDE getSession() completado', {
          hasProfile: !!profileData,
          error: profileError,
          mounted,
        });
        console.log('[AuthProvider:init] Profiles query completado', {
          hasProfile: !!profileData,
          error: profileError?.message ?? null,
        });
        if (profileError || !profileData) {
          console.log('[AuthProvider:init] setState({ status: "unauthenticated" })', {
            reason: 'no-profile-or-error',
          });
          if (mounted) setState({ status: "unauthenticated" });
          return;
        }
        const role = (profileData.role || "").toUpperCase();
        
        // Validar que solo ADMIN puede acceder al sistema
        if (role !== "ADMIN") {
          // Limpia cualquier sesión local y marca como no autenticado
          console.log('[AuthProvider:init] setState({ status: "unauthenticated" })', {
            reason: 'non-admin-role',
          });
          await supabase.auth.signOut();
          if (mounted) setState({ status: "unauthenticated" });
          return;
        }
        
        const profile: Profile = {
          user_id: profileData.user_id,
          full_name: profileData.full_name ?? null,
          email: profileData.email ?? null,
          role: role as UserRole,
          active: !!profileData.active,
        };
        console.log('[AuthProvider:init] ANTES de setState(authenticated) DESDE getSession(), mounted =', mounted);
        console.log('[AuthProvider:init] setState({ status: "authenticated" })');
        if (mounted) setState({ status: "authenticated", profile });
        console.log('[AuthProvider:init] DESPUÉS de setState(authenticated) DESDE getSession()');
      } catch (err: any) {
        // Cualquier error (incluyendo timeout) debe resultar en unauthenticated
        console.error('[AuthProvider:init] Error no capturado en init:', err);
        console.warn('[AuthProvider] Error en inicialización:', err?.message || err);
        if (mounted) setState({ status: "unauthenticated" });
      }
    })();

    // Suscripción a cambios de sesión
    // 🔬 EXPERIMENTO C: Incrementar contador y asignar ID único a esta suscripción
    authSubscriptionCounter += 1;
    const subscriptionId = authSubscriptionCounter;
    console.log('[EXPERIMENTO C] ✅ Suscripción #' + subscriptionId + ' creada en AuthProvider');
    
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        console.log('[AuthProvider:onAuthStateChange] Evento recibido =', event, {
          hasSession: !!session,
          mounted,
          currentStatus: state.status,
          timestamp: Date.now(),
        });
        console.log('[EXPERIMENTO C] 📩 Suscripción #' + subscriptionId + ' recibió evento:', event, 'hasSession =', !!session);
        console.log('[AuthProvider:onAuthStateChange] Evento:', event, {
          hasSession: !!session,
        });
        if (!mounted) return; // Evitar setState después de unmount
        
        if (event === 'INITIAL_SESSION') {
          console.log('[AuthProvider:onAuthStateChange] ⚠️ Evento INITIAL_SESSION detectado (recarga de página / sesión previa)', {
            hasSession: !!session,
            mounted,
          });
        }
        
        // 🔬 EXPERIMENTO A2: Filtrar SIGNED_IN duplicados
        if (event === 'SIGNED_IN') {
          if (hasHandledInitialSignInRef.current === false) {
            // Primer SIGNED_IN (login normal) → procesar normalmente
            console.log('[EXP A2] Primer SIGNED_IN detectado, procesando normalmente');
            hasHandledInitialSignInRef.current = true;
            console.log('[EXP A2] Primer SIGNED_IN manejado, marcando hasHandledInitialSignInRef = true');
            // Continuar con el flujo normal (no hacer return aquí)
          } else {
            // SIGNED_IN duplicado (por ejemplo al volver de pestaña) → IGNORAR
            console.log('[EXP A2] SIGNED_IN duplicado detectado, IGNORANDO evento (no setState, no profiles)');
            return; // Salir temprano sin procesar
          }
        }
        
        // 🔬 EXPERIMENTO A2: Resetear flag en SIGNED_OUT
        if (event === 'SIGNED_OUT') {
          hasHandledInitialSignInRef.current = false;
          console.log('[EXP A2] Evento SIGNED_OUT, reseteando hasHandledInitialSignInRef = false');
          // Continuar con el flujo normal de SIGNED_OUT
        }
        
        // Si no hay sesión: marcar unauthenticated SOLO si el estado actual no es ya unauthenticated
        if (!session) {
          setState(prev => {
            if (prev.status === "unauthenticated") {
              console.log('[AuthProvider:onAuthStateChange] Estado ya era unauthenticated, evitando setState');
              return prev;
            }
            console.log('[AuthProvider:onAuthStateChange] setState({ status: "unauthenticated" }) por falta de sesión');
            return { status: "unauthenticated" };
          });
          return;
        }

        // ✅ OPTIMIZACIÓN CRÍTICA: Si ya estamos autenticados, verificar si realmente cambió algo
        // antes de consultar profiles de nuevo
        if (event === "TOKEN_REFRESHED") {
          // TOKEN_REFRESHED solo actualiza el token, NO el perfil
          // Si ya estamos authenticated con perfil, NO hacer nada
          const currentState = state;
          if (currentState.status === "authenticated" && currentState.profile) {
            console.log('[AuthProvider:onAuthStateChange] TOKEN_REFRESHED: ya authenticated con perfil, saltando reconsulta');
            return; // ✅ Salir temprano sin setState
          }
        }

        const userId = session.user.id;
        console.log('[AuthProvider:onAuthStateChange] Consultando profiles DESDE onAuthStateChange para user_id =', userId, 'event =', event, 'mounted =', mounted);
        console.log('[AuthProvider:onAuthStateChange] Consultando profiles en onAuthStateChange para user_id =', userId);
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, role, active")
          .eq("user_id", userId)
          .maybeSingle();
        
        console.log('[AuthProvider:onAuthStateChange] Profiles DESDE onAuthStateChange completado', {
          hasProfile: !!data,
          error,
          mounted,
          event,
        });
        console.log('[AuthProvider:onAuthStateChange] Profiles query completado en onAuthStateChange', {
          hasProfile: !!data,
          error: error?.message ?? null,
        });
        
        if (!mounted) return; // Verificar nuevamente después de async

        // Si hay error en el fetch, no quedarse en loading
        if (error) {
          console.warn('[AuthProvider] Error fetching profile in onAuthStateChange:', error);
          // Si el estado actual es "loading", mejor marcar unauthenticated que quedarse bloqueado
          setState(prev => {
            if (prev.status === "loading") {
              console.log('[AuthProvider:onAuthStateChange] setState({ status: "unauthenticated" })', {
                reason: 'profile-query-error-and-status-is-loading',
              });
              return { status: "unauthenticated" };
            }
            // Si ya estaba authenticated, mantener el estado actual (no romper la sesión por un error puntual)
            console.log('[AuthProvider:onAuthStateChange] Error en query pero estado ya authenticated, manteniendo estado actual');
            return prev;
          });
          return;
        }

        if (!data) {
          setState(prev => {
            if (prev.status === "unauthenticated") {
              console.log('[AuthProvider:onAuthStateChange] Estado ya era unauthenticated (no perfil), evitando setState');
              return prev;
            }
            console.log('[AuthProvider:onAuthStateChange] setState({ status: "unauthenticated" })', {
              reason: 'no-profile-data',
            });
            return { status: "unauthenticated" };
          });
          return;
        }

        const role = (data.role || "").toUpperCase();
        
        // Validar que solo ADMIN puede acceder al sistema
        if (role !== "ADMIN") {
          // Limpia cualquier sesión local y marca como no autenticado
          setState(prev => {
            if (prev.status === "unauthenticated") {
              console.log('[AuthProvider:onAuthStateChange] Estado ya era unauthenticated (non-admin), evitando setState');
              return prev;
            }
            console.log('[AuthProvider:onAuthStateChange] setState({ status: "unauthenticated" })', {
              reason: 'non-admin-role',
            });
            return { status: "unauthenticated" };
          });
          await supabase.auth.signOut();
          return;
        }
        
        const nextProfile: Profile = {
          user_id: data.user_id,
          full_name: data.full_name ?? null,
          email: data.email ?? null,
          role: role as UserRole,
          active: !!data.active,
        };

        setState(prev => {
          console.log('[AuthProvider:onAuthStateChange] ANTES de setState(authenticated) DESDE onAuthStateChange', {
            prevStatus: prev.status,
            prevUser: prev.status === 'authenticated' ? prev.profile?.user_id : null,
            nextUser: nextProfile?.user_id,
            event,
          });
          // ✅ CRÍTICO: Comparar valores y REUSAR objeto anterior si son iguales
          const sameStatus = prev.status === "authenticated";
          const sameUser = prev.status === "authenticated" && 
            prev.profile && nextProfile &&
            prev.profile.user_id === nextProfile.user_id;
          const sameRole = prev.status === "authenticated" && 
            prev.profile && nextProfile &&
            prev.profile.role === nextProfile.role;

          if (sameStatus && sameUser && sameRole) {
            console.log('[AuthProvider:onAuthStateChange] Perfil sin cambios, REUSANDO estado anterior (state#' + getStateId(prev) + ') desde evento =', event);
            console.log('[AuthProvider:onAuthStateChange] ✅ Perfil sin cambios, REUSANDO objeto anterior (state#' + getStateId(prev) + ')');
            return prev; // ✅ MISMO objeto, NO crear uno nuevo
          }

          const newState = {
            status: "authenticated" as const,
            profile: nextProfile,
          };
          console.log('[AuthProvider:onAuthStateChange] Perfil CAMBIÓ, creando nuevo estado (state#' + getStateId(newState) + ') desde evento =', event);
          console.log('[AuthProvider:onAuthStateChange] ✅ Perfil cambió, creando NUEVO state (state#' + getStateId(newState) + ')');
          return newState;
        });
        console.log('[AuthProvider:onAuthStateChange] DESPUÉS de setState(authenticated) DESDE onAuthStateChange, evento =', event);
      } catch (err) {
        console.error('[AuthProvider:onAuthStateChange] ERROR en handler', {
          error: err,
          event,
          hasSession: !!session,
          mounted,
        });
        console.error('[AuthProvider:onAuthStateChange] Error no capturado:', err);
        // Si no hay sesión, marcar unauthenticated
        if (!session) {
          setState(prev => {
            if (prev.status === "unauthenticated") {
              return prev;
            }
            if (mounted) return { status: "unauthenticated" };
            return prev;
          });
        } else {
          // Si hay sesión pero hubo error, no dejar en "loading"
          // Mejor sacar al login que dejar la app bloqueada
          setState(prev => {
            if (prev.status === "loading") {
              console.log('[AuthProvider:onAuthStateChange] setState({ status: "unauthenticated" })', {
                reason: 'catch-error-and-status-is-loading',
              });
              if (mounted) return { status: "unauthenticated" };
            }
            // Si ya estaba authenticated, mantener estado actual
            return prev;
          });
        }
      }
    });

    return () => {
      console.log('[AuthProvider:useEffect] Cleanup ejecutado, mounted =', mounted);
      console.log('[EXPERIMENTO C] 🧹 Cleanup de suscripción #' + subscriptionId + ' en AuthProvider');
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = React.useCallback(async (email: string, password: string) => {
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
  }, []);

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
    setState({ status: "unauthenticated" });
    // 🔬 EXPERIMENTO A2: Resetear flag al hacer logout
    hasHandledInitialSignInRef.current = false;
    console.log('[EXP A2] signOut completado, reseteando hasHandledInitialSignInRef = false');
  }, []);

  // ✅ OPTIMIZACIÓN CRÍTICA: Usar valores primitivos en dependencias
  // En lugar de depender del objeto `state` completo, dependemos de valores estables
  const value = React.useMemo(
    () => {
      console.log('[AuthProvider:useMemo] Recalculando contexto (state#' + getStateId(state) + ')');
      return { state, signIn, signOut };
    },
    [
      state.status,
      state.status === "authenticated" ? state.profile?.user_id : null,
      state.status === "authenticated" ? state.profile?.role : null,
      signIn,
      signOut
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}