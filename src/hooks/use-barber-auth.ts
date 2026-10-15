import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface BarberInfo {
  id: string;
  name: string;
  nickname: string | null;
  photo_url: string | null;
}

interface BarberAuthState {
  user: User | null;
  barber: BarberInfo | null;
  role: "admin" | "barber" | null;
  loading: boolean;
  isAuthorized: boolean;
}

export function useBarberAuth(): BarberAuthState & { signOut: () => Promise<void> } {
  const router = useRouter();
  const [state, setState] = useState<BarberAuthState>({
    user: null,
    barber: null,
    role: null,
    loading: true,
    isAuthorized: false,
  });

  useEffect(() => {
    let mounted = true;

    async function loadAuth(user: User | null) {
      if (!user) {
        if (mounted) setState({ user: null, barber: null, role: null, loading: false, isAuthorized: false });
        return;
      }

      const userEmail = (user.email ?? "").toLowerCase();
      const isStaffEmail =
        userEmail === "rianbueno2018@gmail.com" ||
        userEmail === "barbosalemueltrabalho@gmail.com";

      let [{ data: roles }, { data: barberData }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase
          .from("barbers")
          .select("id, name, nickname, photo_url")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      // Cada profissional entra apenas no seu próprio painel (sem admin geral)
      let role: "admin" | "barber" | null = roles?.find((r) => r.role === "admin")
        ? "admin"
        : roles?.find((r) => r.role === "barber")
          ? "barber"
          : null;

      // Se não encontrou o barbeiro pelo user_id, buscar por nome de acordo com o e-mail e fazer o vínculo
      if (!barberData && isStaffEmail) {
        const searchTerm = userEmail.includes("lemuel") ? "Lemuel" : "Rian";
        const { data: matchedBarber } = await supabase
          .from("barbers")
          .select("id, name, nickname, photo_url")
          .ilike("name", `%${searchTerm}%`)
          .maybeSingle();

        if (matchedBarber) {
          barberData = matchedBarber;
          // Atualiza user_id no banco em segundo plano para persistir a associação
          supabase.from("barbers").update({ user_id: user.id }).eq("id", matchedBarber.id).then();
        }
      }

      if (mounted) {
        setState({
          user,
          barber: barberData ?? null,
          role,
          loading: false,
          isAuthorized: (role === "admin" || role === "barber") && !!barberData,
        });
      }
    }

    // Initial session
    supabase.auth.getSession().then(({ data }) => {
      loadAuth(data.session?.user ?? null);
    });

    // Auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      loadAuth(session?.user ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  }

  return { ...state, signOut };
}
