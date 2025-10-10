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

  React.useEffect(() => {
    if (state.status === "authenticated") {
      const role = state.profile.role;
      if (role === "ADMIN") nav("/dashboard", { replace: true });
      else nav("/mis-solicitudes", { replace: true });
    }
  }, [state, nav]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const res = await signIn(email, password);
    setLoading(false);
    if (!res.ok) { setErr(res.error ?? "No se pudo iniciar sesión"); return; }
    const from = (loc.state as any)?.from?.pathname as string | undefined;
    // redirección ocurre en el effect al leer el rol
  }

  if (state.status === "authenticated") return null;

  return (
    <div className="relative min-h-dvh">
      <div className="absolute inset-0 bg-[url('/branding/login-bg.jpg')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-white/65" />
      <div className="relative grid min-h-dvh place-items-center p-4">
        <div className="w-full max-w-lg rounded-3xl border border-black/5 bg-white/90 shadow-xl backdrop-blur-[2px]">
          <div className="p-8 space-y-6">
            <form onSubmit={handleSubmit}>
              <h1 className="mb-2 text-xl font-semibold text-[#264a55] text-center">Iniciar sesión en numafix</h1> <br />
              <p className="mb-4 text-sm text-[#264a55] text-center">Accede al sistema y gestiona tus equipos de forma segura.</p>
              <div className="mb-3">
                <label className="mb-1 block text-sm text-[#264a55]">Correo</label>
                <input className="h-11 w-full rounded-xl border px-3 text-sm" value={email} onChange={(e)=>setEmail(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="mb-1 block text-sm text-[#264a55]">Contraseña</label>
                <input type="password" className="h-11 w-full rounded-xl border px-3 text-sm" value={password} onChange={(e)=>setPassword(e.target.value)} />
              </div>
              {err && <div className="mb-3 text-sm text-rose-600">{err}</div>}
              <button className="w-full rounded-xl bg-[#264a55] py-3 text-white font-medium shadow-sm hover:brightness-95 focus:outline-none focus:ring-4 focus:ring-[#264a55]/30 active:brightness-90 transition" type="submit" disabled={loading}>{loading ? "Entrando…" : "Entrar"}</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}