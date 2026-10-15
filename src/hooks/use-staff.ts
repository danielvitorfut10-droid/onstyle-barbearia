import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type StaffContext = {
  loading: boolean;
  session: Session | null;
  isAdmin: boolean;
  barberId: string | null;
  displayName: string;
};

export function useStaff(): StaffContext {
  const [state, setState] = useState<StaffContext>({
    loading: true,
    session: null,
    isAdmin: false,
    barberId: null,
    displayName: "",
  });

  useEffect(() => {
    let active = true;

    async function load(session: Session | null) {
      if (!session) {
        if (active)
          setState({ loading: false, session: null, isAdmin: false, barberId: null, displayName: "" });
        return;
      }
      const [{ data: roles }, { data: barber }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", session.user.id),
        supabase.from("barbers").select("id, name").eq("user_id", session.user.id).maybeSingle(),
        supabase.from("profiles").select("full_name").eq("id", session.user.id).maybeSingle(),
      ]);
      if (!active) return;
      setState({
        loading: false,
        session,
        isAdmin: (roles ?? []).some((r) => r.role === "admin"),
        barberId: barber?.id ?? null,
        displayName: barber?.name || profile?.full_name || session.user.email || "Usuário",
      });
    }

    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        load(session);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
