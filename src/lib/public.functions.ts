import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildSlots, dayRange, toIntervals, weekdayOf } from "./booking.server";
import { publicClient } from "./supabase-public.server";
// Public site data/availability/booking endpoints (uses publishable key client).

const availabilitySchema = z.object({
  barberId: z.string().uuid(),
  // serviceId deve ser UUID real do banco (não IDs virtuais)
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const bookingSchema = z.object({
  barberId: z.string().uuid(),
  // UUID real do catálogo do banco
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(10).max(20),
  notes: z.string().trim().max(200).optional().or(z.literal("")),
  addonServiceId: z.string().uuid().nullable().optional(),
  // Quando true: salva o agendamento mas zera o price_cents (cliente mensalista)
  isMensalista: z.boolean().optional().default(false),
});

// ─── Serviços canônicos da OnStyle ───────────────────────────────────────────
// sort_order define a ordem de exibição.
// bookable = true  → aparece no modal de agendamento
// bookable = false → apenas vitrine (seção de serviços do site)
type CanonicalService = {
  key: string;         // fragmento do nome para match (lowercase)
  name: string;
  description: string;
  price_cents: number;
  duration_min: number;
  sort_order: number;
  bookable: boolean;   // false = vitrine apenas
};

const CANONICAL_SERVICES: CanonicalService[] = [
  {
    key: "corte + barba",
    name: "Corte + barba",
    description: "Combo completo de corte e barba com acabamento em navalha.",
    price_cents: 7000,
    duration_min: 60,
    sort_order: 1,
    bookable: true,
  },
  {
    key: "corte + barba + sobrancelha",
    name: "Corte + barba + sobrancelha",
    description: "Combo completo de corte, barba e sobrancelha.",
    price_cents: 8500,
    duration_min: 60,
    sort_order: 2,
    bookable: true,
  },
  {
    key: "corte",
    name: "Corte",
    description: "Corte de cabelo completo com acabamento.",
    price_cents: 4000,
    duration_min: 60,
    sort_order: 3,
    bookable: true,
  },
  {
    key: "barba",
    name: "Barba",
    description: "Barba com acabamento em navalha.",
    price_cents: 3000,
    duration_min: 60,
    sort_order: 4,
    bookable: true,
  },
  {
    key: "luzes",
    name: "Luzes",
    description: "Coloração com técnica de luzes para um visual moderno e natural.",
    price_cents: 6000,
    duration_min: 60,
    sort_order: 5,
    bookable: true,
  },
  {
    key: "platinado",
    name: "Platinado",
    description: "Descoloração completa para o visual platinado exclusivo.",
    price_cents: 11000,
    duration_min: 60,
    sort_order: 6,
    bookable: true,
  },
  {
    key: "relaxamento",
    name: "Relaxamento",
    description: "Tratamento de relaxamento capilar para fios alinhados e macios.",
    price_cents: 4000,
    duration_min: 60,
    sort_order: 7,
    bookable: true,
  },
  {
    key: "limpeza de pele",
    name: "Limpeza de pele",
    description: "Limpeza de pele profunda para uma pele saudável e renovada.",
    price_cents: 2000,
    duration_min: 60,
    sort_order: 8,
    bookable: true,
  },
  // ── Vitrine apenas (não aparecem no modal de agendamento) ──
  {
    key: "sobrancelha",
    name: "Sobrancelha",
    description: "Design e limpeza de sobrancelha com acabamento preciso.",
    price_cents: 1500,
    duration_min: 60,
    sort_order: 9,
    bookable: false,
  },
  {
    key: "cavanhaque",
    name: "Cavanhaque",
    description: "Modelagem de cavanhaque com navalha e acabamento perfeito.",
    price_cents: 1500,
    duration_min: 60,
    sort_order: 10,
    bookable: false,
  },
  {
    key: "pezinho",
    name: "Pezinho",
    description: "Acabamento no pezinho para manter o visual impecável entre cortes.",
    price_cents: 2000,
    duration_min: 60,
    sort_order: 11,
    bookable: false,
  },
];

/**
 * Encontra o canônico correto para um serviço pelo nome.
 * Prioriza matches mais específicos (mais palavras) para evitar
 * que "corte" sobrescreva "corte + barba".
 */
function findCanonical(name: string): CanonicalService | undefined {
  const normalized = name.trim().toLowerCase().replace(/\s*\+\s*/g, "+").replace(/\s+/g, " ");
  return CANONICAL_SERVICES.find((c) =>
    c.name.toLowerCase().replace(/\s*\+\s*/g, "+").replace(/\s+/g, " ") === normalized
  );
}

export const getSiteData = createServerFn({ method: "GET" }).handler(async () => {
  const db = publicClient();

  const [barbersRes, servicesRes, hoursRes, settingsRes] = await Promise.all([
    db
      .from("barbers")
      .select("id, name, nickname, bio, photo_url, sort_order")
      .eq("active", true)
      .order("sort_order"),
    db
      .from("services")
      .select("id, name, description, price_cents, duration_min, sort_order")
      .eq("active", true)
      .order("sort_order"),
    db
      .from("business_hours")
      .select("weekday, open_time, close_time, closed")
      .order("weekday"),
    db
      .from("settings")
      .select("shop_name, address, maps_url, phone, whatsapp, instagram, whatsapp_template")
      .eq("id", 1)
      .maybeSingle(),
  ]);

  let barbers = barbersRes.data ?? [];
  let services = servicesRes.data ?? [];
  let settings = settingsRes.data ?? null;

  // Atualiza bios dos barbeiros ativos
  barbers = barbers.map((b) => {
    const lower = b.name.toLowerCase();
    if (lower.includes("gabriel")) {
      return {
        ...b,
        bio: "Especialista em cortes modernos, degradês, acabamento em navalha, barba desenhada e cortes infantis.",
      };
    }
    if (lower.includes("romario") || lower.includes("romário")) {
      return {
        ...b,
        bio: "Especialista em cortes modernos, tradicionais, degradês, acabamento em navalha, barba desenhada e desenho.",
      };
    }
    return b;
  });

  if (servicesRes.error) {
    throw new Error("Não foi possível carregar os serviços. Tente novamente.");
  }
  // Não inventa serviços/UUIDs nem substitui o preço gravado no banco.
  services = services.map((s) => ({
    ...s,
    description: s.description ?? findCanonical(s.name)?.description ?? "",
  }));

  // Ordena por sort_order
  services.sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99));

  if (settings) {
    settings = {
      ...settings,
      address: "Avenida Carlos Lacerda, 183",
      maps_url: "https://maps.google.com/maps?q=Avenida+Carlos+Lacerda,+183,+Campinas&t=&z=15&ie=UTF8&iwloc=&output=embed",
    };
  } else {
    settings = {
      shop_name: "OnStyle Barbearia",
      address: "Avenida Carlos Lacerda, 183",
      maps_url: "https://maps.google.com/maps?q=Avenida+Carlos+Lacerda,+183,+Campinas&t=&z=15&ie=UTF8&iwloc=&output=embed",
      phone: "+55 19 98909-7315",
      whatsapp: "5519989097315",
      instagram: "",
      whatsapp_template: "Olá! Fiz um agendamento na OnStyle Barbearia.",
    };
  }

  return {
    barbers,
    services,
    hours: hoursRes.data ?? [],
    settings,
  };
});

export const getAvailability = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => availabilitySchema.parse(data))
  .handler(async ({ data }) => {
    const db = publicClient();

    const [serviceRes, hourRes] = await Promise.all([
      db
        .from("services")
        .select("duration_min")
        .eq("active", true)
        .eq("id", data.serviceId)
        .maybeSingle(),
      db
        .from("business_hours")
        .select("open_time, close_time, closed")
        .eq("weekday", weekdayOf(data.date))
        .maybeSingle(),
    ]);

    if (serviceRes.error || hourRes.error || !serviceRes.data) {
      throw new Error("Não foi possível consultar a disponibilidade.");
    }
    const hour = hourRes.data;

    // Só retorna vazio se o dia não tiver horário configurado ou estiver fechado
    if (!hour || hour.closed) return { slots: [] as { time: string; iso: string }[] };

    // Duração: usa a do banco se disponível, senão 60 min (padrão OnStyle)
    const durationMin = serviceRes.data?.duration_min ?? 60;

    const range = dayRange(data.date);
    const { data: busyRows, error: busyError } = await db.rpc("get_public_busy", {
      _barber_id: data.barberId,
      _start: range.start,
      _end: range.end,
    });
    if (busyError) throw new Error("Não foi possível consultar os horários ocupados.");
    const rows = busyRows ?? [];
    const unblockedNightStarts = rows
      .filter((r) => r.kind === "unblocked")
      .map((r) => new Date(r.starts_at).getTime());
    const busy = rows.filter((r) => r.kind !== "unblocked");

    const slots = buildSlots({
      dateStr: data.date,
      openTime: String(hour.open_time).slice(0, 5),
      closeTime: String(hour.close_time).slice(0, 5),
      intervalMin: 60,
      durationMin,
      busy: toIntervals(busy),
      unblockedNightStarts,
    });

    return { slots };
  });

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => bookingSchema.parse(data))
  .handler(async ({ data }) => {
    const supabasePublic = publicClient();
    const { toIso } = await import("./format");
    const startsAt = new Date(toIso(data.date, data.time));
    if (Number.isNaN(startsAt.getTime())) {
      return { ok: false as const, error: "Escolha um horário futuro." };
    }

    if (startsAt.getTime() <= Date.now()) {
      return { ok: false as const, error: "Escolha um horário futuro." };
    }

    // O banco valida os UUIDs, lê os preços e salva o total numa única operação.
    // Tags de sistema são construídas aqui; o texto livre não define preços.
    const rawNotes = (data.notes ?? "")
      .replace(/\[(?:MENSALISTA|ADICIONAL_ID|Serviço adicional)[^\]]*\]/gi, "")
      .trim();
    const parts: string[] = [];
    if (data.isMensalista) parts.push("[MENSALISTA]");
    if (data.addonServiceId) parts.push(`[ADICIONAL_ID:${data.addonServiceId}]`);
    if (rawNotes) parts.push(rawNotes);
    const finalNotes = parts.join("\n");
    if (finalNotes.length > 280) {
      return { ok: false as const, error: "Reduza as observações para continuar." };
    }

    const { data: rpcResult, error: rpcErr } = await supabasePublic.rpc("create_public_booking", {
      _barber_id: data.barberId,
      _service_id: data.serviceId,
      _starts_at: startsAt.toISOString(),
      _name: data.name,
      _phone: data.phone,
      _notes: finalNotes,
      _label: "",
    });
    if (rpcErr) {
      console.error("[createBooking] RPC falhou:", rpcErr.code);
      return { ok: false as const, error: "Não foi possível concluir o agendamento. Tente novamente." };
    }
    const result = rpcResult as {
      ok?: boolean; id?: string; barberName?: string;
      serviceName?: string; priceCents?: number; error?: string;
    } | null;
    if (!result?.ok) {
      return { ok: false as const, error: result?.error ?? "Não foi possível concluir o agendamento." };
    }
    // Sem UPDATE posterior, preço vindo do navegador ou fallback para Corte.
    if (!result.id || typeof result.priceCents !== "number" || !result.serviceName || !result.barberName) {
      return { ok: false as const, error: "Resposta incompleta. Confira a reserva com a barbearia antes de tentar novamente." };
    }
    return {
      ok: true as const,
      id: result.id,
      barberName: result.barberName,
      serviceName: result.serviceName,
      priceCents: result.priceCents,
    };
  });
