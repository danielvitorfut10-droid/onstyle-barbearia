import { useState } from "react";
import { X, Eye, EyeOff, Loader2, Scissors, Lock, CheckCircle2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRouter } from "@tanstack/react-router";

interface BarberLoginModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = "login" | "change-password" | "done";

export function BarberLoginModal({ open, onClose }: BarberLoginModalProps) {
  const router = useRouter();

  // ── Login state ───────────────────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Change-password state ─────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("login");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);

  if (!open) return null;

  // ── Handlers ──────────────────────────────────────────────────────────────
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

      // Check barber/admin role
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

      // Check if this user still needs to set a new password (one-time)
      const passwordChanged = data.user.user_metadata?.password_changed === true;

      if (passwordChanged) {
        // Already changed — go straight to panel
        onClose();
        router.navigate({ to: "/painel" });
      } else {
        // First login — MUST change password before accessing panel
        setStep("change-password");
        setLoading(false);
      }
    } catch {
      setError("Erro inesperado. Tente novamente.");
      setLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setChangeError(null);

    if (!currentPassword) {
      setChangeError("Informe sua senha atual.");
      return;
    }
    if (!newPassword) {
      setChangeError("Informe a nova senha.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangeError("As senhas não coincidem.");
      return;
    }

    setChangingPassword(true);

    try {
      // Pass current_password directly in updateUser — required by Supabase
      // when GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD is enabled.
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
        current_password: currentPassword,
        data: { password_changed: true },
      });

      if (updateError) {
        const msg = updateError.message?.toLowerCase() ?? "";
        if (msg.includes("current_password") || msg.includes("current password")) {
          setChangeError("Senha atual incorreta. Verifique e tente novamente.");
        } else if (msg.includes("same password") || msg.includes("different from the old password")) {
          setChangeError("A nova senha não pode ser igual à senha atual. Escolha outra.");
        } else if (msg.includes("at least 6")) {
          setChangeError("A senha deve ter pelo menos 6 caracteres.");
        } else {
          setChangeError(`Não foi possível alterar a senha: ${updateError.message || "Tente novamente."}`);
        }
        setChangingPassword(false);
        return;
      }

      // Show success briefly, then navigate
      setStep("done");
      setTimeout(() => {
        onClose();
        router.navigate({ to: "/painel" });
      }, 1800);
    } catch {
      setChangeError("Erro inesperado. Tente novamente.");
      setChangingPassword(false);
    }
  }

  // (no skip — password change is mandatory)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && step === "login" && onClose()}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => step === "login" && onClose()}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-800 shadow-2xl"
        style={{
          background: "linear-gradient(135deg, rgba(18,18,18,0.98) 0%, rgba(30,30,30,0.98) 100%)",
        }}
      >
        {/* Accent top bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#39ff14]/0 via-[#39ff14] to-[#39ff14]/0" />

        {/* Close button — only on login step */}
        {step === "login" && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* ── STEP: LOGIN ─────────────────────────────────────────── */}
        {step === "login" && (
          <div className="px-8 pb-8 pt-7">
            <div className="mb-7 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 border border-zinc-700 shadow-lg">
                <Scissors className="h-6 w-6 text-[#39ff14]" />
              </div>
              <h2 className="font-display text-xl font-bold text-white">Área do Barbeiro</h2>
              <p className="mt-1 text-sm text-zinc-500">Acesso exclusivo para profissionais</p>
            </div>

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
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#39ff14] px-4 py-3 text-sm font-bold text-black shadow-lg shadow-[#39ff14]/20 transition-all hover:bg-[#39ff14]/90 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <Scissors className="h-4 w-4" />
                    Entrar no painel
                  </>
                )}
              </button>
            </form>

            <p className="mt-5 text-center text-xs text-zinc-600">
              Acesso restrito a barbeiros cadastrados
            </p>
          </div>
        )}

        {/* ── STEP: CHANGE PASSWORD ────────────────────────────────── */}
        {step === "change-password" && (
          <div className="px-8 pb-8 pt-7">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30 shadow-lg">
                <ShieldAlert className="h-6 w-6 text-amber-400" />
              </div>
              <h2 className="font-display text-xl font-bold text-white">Crie sua senha</h2>
              <p className="mt-1.5 text-sm text-zinc-400 leading-snug">
                Defina uma senha pessoal para acessar o painel.
                <br />
                <span className="text-xs text-zinc-600">Obrigatório — feito apenas uma vez.</span>
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Senha atual */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Senha atual
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Sua senha de acesso atual"
                    required
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-4 py-3 pr-11 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    tabIndex={-1}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Nova senha */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Nova senha
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite a nova senha"
                    required
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-4 py-3 pr-11 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmar senha */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Confirmar nova senha
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    required
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-4 py-3 pr-11 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {changeError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {changeError}
                </div>
              )}

              <button
                type="submit"
                disabled={changingPassword}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 text-sm font-bold text-black shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
              >
                {changingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Salvar nova senha
                  </>
                )}
              </button>
            </form>

            {/* No skip option — changing password is mandatory */}
          </div>
        )}

        {/* ── STEP: DONE ───────────────────────────────────────────── */}
        {step === "done" && (
          <div className="px-8 pb-8 pt-7 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#39ff14]/10 border border-[#39ff14]/30 shadow-lg">
              <CheckCircle2 className="h-8 w-8 text-[#39ff14]" />
            </div>
            <h2 className="font-display text-xl font-bold text-white">Senha criada!</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Sua senha foi definida com sucesso.
              <br />
              Use-a nos próximos acessos.
              <br />
              <span className="text-xs text-zinc-600">Redirecionando para o painel...</span>
            </p>
            <div className="mt-4 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-[#39ff14]" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
