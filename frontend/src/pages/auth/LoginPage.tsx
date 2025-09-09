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
    <div className="flex min-h-dvh items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold">Iniciar sesión</h1>
        <p className="mb-4 text-sm text-slate-600">Usa tu correo y contraseña de Supabase.</p>
        <div className="mb-3">
          <label className="mb-1 block text-sm">Correo</label>
          <input className="h-11 w-full rounded-xl border px-3 text-sm" value={email} onChange={(e)=>setEmail(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="mb-1 block text-sm">Contraseña</label>
          <input type="password" className="h-11 w-full rounded-xl border px-3 text-sm" value={password} onChange={(e)=>setPassword(e.target.value)} />
        </div>
        {err && <div className="mb-3 text-sm text-rose-600">{err}</div>}
        <Button className="w-full rounded-xl" type="submit" disabled={loading}>{loading ? "Entrando…" : "Entrar"}</Button>
      </form>
    </div>
  );
}