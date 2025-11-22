import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/auth.store";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const { state, signIn } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [justAttemptedLogin, setJustAttemptedLogin] = React.useState(false);

  React.useEffect(() => {
    // ✅ Caso 1: admin válido
    if (state.status === "authenticated") {
      setErr(null);
      setJustAttemptedLogin(false);
      setLoading(false);
      nav("/dashboard", { replace: true });
      return;
    }

    // ✅ Caso 2: en validación (session/profile/role)
    if (state.status === "loading") {
      // Mientras se valida no mostramos errores
      setErr(null);
      return;
    }

    // ✅ Caso 3: credenciales válidas pero NO es admin
    // onAuthStateChange ya dejó status en "unauthenticated"
    // y solo marcamos justAttemptedLogin = true cuando signIn fue ok.
    if (state.status === "unauthenticated" && justAttemptedLogin) {
      setErr("Solo usuarios administradores pueden acceder al sistema SISGEMEC.");
      setJustAttemptedLogin(false);
      setLoading(false); // 🔹 IMPORTANTE: detener "Entrando..."
      return;
    }

    // Otros casos:
    // - credenciales incorrectas: se manejan en handleSubmit (setErr + setLoading(false))
    // - primer render sin intento de login: no hacemos nada aquí
  }, [state.status, justAttemptedLogin, nav]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    // empezamos intento de login
    setLoading(true);

    const res = await signIn(email, password);

    // si signIn devuelve estructura { ok, error }
    if (!res.ok) {
      // error de credenciales u otro error directo de Supabase
      setErr(res.error ?? "No se pudo iniciar sesión.");
      setLoading(false);
      setJustAttemptedLogin(false); // no disparar lógica de solo-admin
      return;
    }

    // signIn fue aceptado por Supabase → ahora onAuthStateChange validará el rol
    setJustAttemptedLogin(true);
    // dejamos loading activo hasta que el estado global cambie
  }

  if (state.status === "authenticated") return null;

  const isLoading = loading || state.status === "loading";

  return (
    <div className="relative min-h-dvh">
      <div className="absolute inset-0 bg-[url('/branding/login-bg.jpg')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-white/65" />
      <div className="relative grid min-h-dvh place-items-center p-4">
        <div className="w-full max-w-lg rounded-3xl border border-black/5 bg-white/90 shadow-xl backdrop-blur-[2px]">
          <div className="p-8 space-y-6">
            <form onSubmit={handleSubmit}>
              <h1 className="mb-2 text-xl font-semibold text-[#264a55] text-center">Iniciar sesión en SISGEMEC</h1> <br />
              <p className="mb-4 text-sm text-[#264a55] text-center">Accede al sistema y gestiona tus equipos de forma segura.</p>
              <div className="mb-3">
                <label className="mb-1 block text-sm text-[#264a55]">Correo</label>
                <input className="h-11 w-full rounded-xl border px-3 text-sm" value={email} onChange={(e)=>setEmail(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="mb-1 block text-sm text-[#264a55]">Contraseña</label>
                <input type="password" className="h-11 w-full rounded-xl border px-3 text-sm" value={password} onChange={(e)=>setPassword(e.target.value)} />
              </div>
              {err && !isLoading && (
                <div className="mb-3 text-sm text-rose-600">{err}</div>
              )}
              <button className="w-full rounded-xl bg-[#264a55] py-3 text-white font-medium shadow-sm hover:brightness-95 focus:outline-none focus:ring-4 focus:ring-[#264a55]/30 active:brightness-90 transition" type="submit" disabled={isLoading}>{isLoading ? "Entrando…" : "Entrar"}</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}