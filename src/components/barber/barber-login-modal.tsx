import { useState } from "react";
import { X, User, Eye, EyeOff, Loader2, Scissors } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRouter } from "@tanstack/react-router";

interface BarberLoginModalProps {
  open: boolean;
  onClose: () => void;
}

export function BarberLoginModal({ open, onClose }: BarberLoginModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError("E-mail ou senha incorretos. Tente novamente.");
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError("Não foi possível autenticar. Tente novamente.");
        setLoading(false);
        return;
      }

      // Check if user has barber or admin role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);

      const hasAccess = roles?.some((r) => r.role === "barber" || r.role === "admin");

      if (!hasAccess) {
        await supabase.auth.signOut();
        setError("Acesso negado. Este portal é exclusivo para barbeiros.");
        setLoading(false);
        return;
      }

      onClose();
      router.navigate({ to: "/painel" });
    } catch {
      setError("Erro inesperado. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-800 shadow-2xl"
        style={{
          background: "linear-gradient(135deg, rgba(18,18,18,0.98) 0%, rgba(30,30,30,0.98) 100%)",
        }}
      >
        {/* Green accent top bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#39ff14]/0 via-[#39ff14] to-[#39ff14]/0" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-8 pb-8 pt-7">
          {/* Header */}
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 border border-zinc-700 shadow-lg">
              <Scissors className="h-6 w-6 text-[#39ff14]" />
            </div>
            <h2 className="font-display text-xl font-bold text-white">Área do Barbeiro</h2>
            <p className="mt-1 text-sm text-zinc-500">Acesso exclusivo para profissionais</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-400">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-[#39ff14]/60 focus:ring-1 focus:ring-[#39ff14]/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-4 py-3 pr-11 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-[#39ff14]/60 focus:ring-1 focus:ring-[#39ff14]/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#39ff14] px-4 py-3 text-sm font-bold text-black shadow-lg shadow-[#39ff14]/20 transition-all hover:bg-[#39ff14]/90 hover:shadow-[#39ff14]/30 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <User className="h-4 w-4" />
                  Entrar no painel
                </>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-zinc-600">
            Acesso restrito a barbeiros cadastrados
          </p>
        </div>
      </div>
    </div>
  );
}
