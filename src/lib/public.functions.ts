import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildSlots, dayRange, toIntervals, weekdayOf } from "./booking.server";
import { publicClient } from "./supabase-public.server";
// Public site data/availability/booking endpoints (uses publishable key client).

const availabilitySchema = z.object({
  barberId: z.string().uuid(),
  // serviceId deve ser UUID real do banco (não IDs virtuais)
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const bookingSchema = z.object({
  barberId: z.string().uuid(),
  // serviceId pode ser UUID real do banco ou ID canônico virtual (srv-canonical-N)
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(10).max(20),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  extraPriceCents: z.number().int().min(0).optional().default(0),
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
  const lower = name.toLowerCase();
  // Ordena por especificidade (key mais longa primeiro)
  const sorted = [...CANONICAL_SERVICES].sort((a, b) => b.key.length - a.key.length);
  return sorted.find((c) => lower.includes(c.key));
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

  // Aplica os dados canônicos sobre os serviços do banco
  services = services.map((s) => {
    const canonical = findCanonical(s.name);
    if (canonical) {
      return {
        ...s,
        name: canonical.name,
        description: canonical.description,
        price_cents: canonical.price_cents,
        duration_min: 60, // sempre 1h
        sort_order: canonical.sort_order,
      };
    }
    return { ...s, duration_min: 60 };
  });

  // Garante que todos os canônicos bookable existam (mesmo que não estejam no banco)
  for (const canonical of CANONICAL_SERVICES) {
    const already = services.some((s) => s.name.toLowerCase() === canonical.name.toLowerCase());
    if (!already) {
      services.push({
        id: `srv-canonical-${canonical.sort_order}`,
        name: canonical.name,
        description: canonical.description,
        price_cents: canonical.price_cents,
        duration_min: 60,
        sort_order: canonical.sort_order,
      });
    }
  }

  // Remove duplicatas — ID real do banco sempre tem prioridade sobre ID canônico virtual
  const seen = new Map<string, typeof services[0]>();
  for (const s of services) {
    const key = s.name.toLowerCase();
    const existing = seen.get(key);
    const currentIsVirtual = s.id.startsWith("srv-canonical-");
    const existingIsVirtual = existing?.id.startsWith("srv-canonical-") ?? true;
    // Aceita o novo elemento se: não há existente, ou o existente é virtual e o novo é real
    if (!existing || (existingIsVirtual && !currentIsVirtual)) {
      seen.set(key, s);
    }
  }
  services = Array.from(seen.values());

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

    // Busca o horário do dia (obrigatório) e opcionalmente o serviço
    // O serviceId pode ser um ID canônico virtual (srv-canonical-*) que não existe no banco —
    // nesse caso usamos 60 min como duração padrão em vez de retornar slots vazios.
    const [serviceRes, hourRes] = await Promise.all([
      // Tenta buscar pelo ID real; se não encontrar, não é erro — usamos fallback
      db
        .from("services")
        .select("duration_min")
        .eq("id", data.serviceId)
        .maybeSingle(),
      db
        .from("business_hours")
        .select("open_time, close_time, closed")
        .eq("weekday", weekdayOf(data.date))
        .maybeSingle(),
    ]);

    const hour = hourRes.data;

    // Só retorna vazio se o dia não tiver horário configurado ou estiver fechado
    if (!hour || hour.closed) return { slots: [] as { time: string; iso: string }[] };

    // Duração: usa a do banco se disponível, senão 60 min (padrão OnStyle)
    const durationMin = serviceRes.data?.duration_min ?? 60;

    const range = dayRange(data.date);
    const { data: busyRows } = await db.rpc("get_public_busy", {
      _barber_id: data.barberId,
      _start: range.start,
      _end: range.end,
    });
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

    // Normalização para comparação de nomes
    const nameNorm = (n: string) => n.toLowerCase().replace(/[^a-z0-9+]/g, "");

    // ── 1. Determina o nome canônico do serviço ──────────────────────────────
    // Usado como _label no RPC para resolução interna por SECURITY DEFINER
    let canonicalName: string = "";
    let canonicalPriceCents: number = 0;
    let canonicalDurationMin: number = 60;

    const isRealUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      data.serviceId
    );

    if (!isRealUuid) {
      // ID virtual srv-canonical-N → resolve pelo sort_order
      const canonicalOrder = parseInt(data.serviceId.replace("srv-canonical-", ""), 10);
      const canonical = CANONICAL_SERVICES.find((c) => c.sort_order === canonicalOrder);
      if (canonical) {
        canonicalName = canonical.name;
        canonicalPriceCents = canonical.price_cents;
        canonicalDurationMin = canonical.duration_min;
      }
      console.log("[createBooking] ID virtual:", data.serviceId, "->", canonicalName);
    }

    // ── 2. Tenta buscar serviços do banco (pode falhar por RLS) ──────────────
    // Se falhar, continuamos — o RPC tem SECURITY DEFINER e resolve internamente.
    const { data: allServices, error: svcListErr } = await supabasePublic
      .from("services")
      .select("id, name, price_cents, duration_min, sort_order, active")
      .order("sort_order");

    if (svcListErr) {
      console.warn("[createBooking] SELECT services falhou (RLS?):", svcListErr.message, "— RPC vai resolver internamente");
    }

    const activeServices = allServices?.filter((s) => s.active !== false) ?? [];
    const anyServices = allServices ?? [];

    // ── 3. Resolve UUID real e nome canônico ────────────────────────────────
    // rpcServiceId = UUID a enviar ao RPC (pode ser zero UUID se banco inacessível)
    // rpcLabel     = nome do serviço para fallback interno no RPC por SECURITY DEFINER
    // NULL_UUID    = UUID sentinel que o RPC vai ignorar e usar _label
    const NULL_UUID = "00000000-0000-0000-0000-000000000000";
    let rpcServiceId: string;
    let rpcLabel: string;
    let clientPriceCents: number = canonicalPriceCents;
    let clientDurationMin: number = canonicalDurationMin;

    if (isRealUuid) {
      // UUID real: pode ou não existir no banco local
      const byId = anyServices.find((s) => s.id === data.serviceId);
      if (byId) {
        rpcServiceId = byId.id;
        rpcLabel     = byId.name;
        clientPriceCents  = byId.price_cents;
        clientDurationMin = byId.duration_min;
        console.log("[createBooking] UUID real encontrado:", rpcServiceId, rpcLabel);
      } else {
        // UUID não encontrado localmente (RLS bloqueou ou serviço novo)
        // Mandamos o UUID mesmo assim — o RPC tenta pelo UUID e cai no fallback por nome
        rpcServiceId = data.serviceId;
        // Tenta resolver nome via canônicos pelo UUID → só possível se coincidencialmente
        // o ID mapeia para algo na lista local; se não, usamos ID como label
        const matchByOrder = activeServices.find((s) =>
          nameNorm(s.name) === nameNorm(canonicalName)
        );
        rpcLabel = matchByOrder?.name ?? (canonicalName || data.serviceId);
        if (matchByOrder) {
          clientPriceCents  = matchByOrder.price_cents;
          clientDurationMin = matchByOrder.duration_min;
        }
        console.warn("[createBooking] UUID", data.serviceId, "não encontrado localmente — RPC vai testar internamente, label:", rpcLabel);
      }
    } else {
      // ID virtual srv-canonical-N
      const canonical = CANONICAL_SERVICES.find((c) => nameNorm(c.name) === nameNorm(canonicalName));

      // Tenta encontrar o UUID real pelo nome no banco local
      const dbMatch =
        activeServices.find((s) => nameNorm(s.name) === nameNorm(canonicalName)) ??
        anyServices.find((s) => nameNorm(s.name) === nameNorm(canonicalName)) ??
        (canonical ? (
          activeServices.find((s) => nameNorm(s.name).includes(nameNorm(canonical.key))) ??
          anyServices.find((s) => nameNorm(s.name).includes(nameNorm(canonical.key)))
        ) : undefined);

      if (dbMatch) {
        rpcServiceId = dbMatch.id;
        rpcLabel     = dbMatch.name;
        clientPriceCents  = canonical?.price_cents ?? dbMatch.price_cents;
        clientDurationMin = dbMatch.duration_min;
        console.log("[createBooking] ID virtual resolvido por nome:", rpcServiceId, rpcLabel);
      } else if (anyServices.length > 0) {
        // Banco acessível mas serviço não existe — usa primeiro ativo como FK
        // (o RPC vai usar o nome canônico via _label para criar o registro)
        const firstActive = activeServices[0] ?? anyServices[0];
        rpcServiceId = firstActive.id;
        rpcLabel     = canonicalName || firstActive.name;
        clientPriceCents  = canonicalPriceCents || firstActive.price_cents;
        console.warn("[createBooking] Serviço canônico não encontrado no banco — FK fallback:", rpcServiceId, "label:", rpcLabel);
      } else {
        // Banco completamente inacessível (RLS bloqueou tudo)
        // Usamos UUID nulo e o RPC resolve pelo nome (_label) com SECURITY DEFINER
        rpcServiceId = NULL_UUID;
        rpcLabel     = canonicalName;
        console.warn("[createBooking] Banco inacessível — usando NULL_UUID + label:", rpcLabel);
      }
    }

    if (!rpcLabel) {
      console.error("[createBooking] Não foi possível determinar nome do serviço.");
      return {
        ok: false as const,
        error: "Serviço inválido. Recarregue a página e tente novamente.",
      };
    }

    console.log("[createBooking] Chamando RPC — service_id:", rpcServiceId, "label:", rpcLabel);

    // ── 4. Chama o RPC create_public_booking (SECURITY DEFINER) ─────────────
    // SECURITY DEFINER bypassa RLS — resolve serviço pelo UUID ou pelo _label.
    // Valida serviço ativo, barbeiro ativo, conflito atômico de horário.
    const isMensalista = data.isMensalista ?? false;
    const startsAtIso = startsAt.toISOString();
    const finalNotes = data.notes?.trim() ?? "";

    const { data: rpcResult, error: rpcErr } = await supabasePublic.rpc("create_public_booking", {
      _barber_id:  data.barberId,
      _service_id: rpcServiceId,
      _starts_at:  startsAtIso,
      _name:       data.name,
      _phone:      data.phone,
      _notes:      finalNotes,
      _label:      rpcLabel,
    });

    if (rpcErr) {
      console.error("[createBooking] Erro no RPC create_public_booking:", rpcErr);
      return { ok: false as const, error: "Não foi possível concluir o agendamento. Tente novamente." };
    }

    // O RPC retorna JSON: { ok, id?, barberName?, serviceName?, priceCents?, error? }
    const result = rpcResult as {
      ok: boolean;
      id?: string;
      barberName?: string;
      serviceName?: string;
      priceCents?: number;
      error?: string;
    };

    if (!result.ok) {
      console.error("[createBooking] RPC retornou erro lógico:", result.error);
      return { ok: false as const, error: result.error ?? "Não foi possível concluir o agendamento." };
    }

    // ── 5. Preço final ───────────────────────────────────────────────────────
    // Mensalista tem prioridade absoluta: preço sempre 0
    const extraCents = isMensalista ? 0 : (data.extraPriceCents ?? 0);
    const basePriceCents = result.priceCents ?? clientPriceCents ?? 0;
    const totalPriceCents = isMensalista ? 0 : basePriceCents + extraCents;

    // Atualiza o price_cents no banco em dois casos:
    //   a) mensalista → zera o valor (UPDATE price_cents = 0)
    //   b) addon      → soma o valor adicional
    // A política RLS "Public update own appointment price" permite anon UPDATE.
    if (result.id && (isMensalista || extraCents > 0)) {
      const { error: updErr } = await supabasePublic
        .from("appointments")
        .update({ price_cents: totalPriceCents })
        .eq("id", result.id);
      if (updErr) {
        // Não é crítico: o agendamento foi criado. Só o preço não foi zerado/atualizado.
        console.warn("[createBooking] UPDATE price_cents falhou:", updErr.message);
      } else {
        console.log("[createBooking] price_cents atualizado para:", totalPriceCents, isMensalista ? "(mensalista)" : "(addon)");
      }
    }

    console.log("[createBooking] Agendamento criado:", result.id, "barbeiro:", result.barberName, "serviço:", result.serviceName);

    return {
      ok: true as const,
      id:          result.id ?? "",
      barberName:  result.barberName ?? "",
      serviceName: result.serviceName ?? rpcLabel,
      priceCents:  totalPriceCents,
    };
  });
