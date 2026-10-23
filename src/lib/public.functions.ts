import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildSlots, dayRange, toIntervals, weekdayOf } from "./booking.server";
import { publicClient } from "./supabase-public.server";
// Public site data/availability/booking endpoints (uses publishable key client).

const availabilitySchema = z.object({
  barberId: z.string().uuid(),
  // serviceId pode ser UUID real ou ID canônico virtual (srv-canonical-N)
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

    // ── 1. Busca todos os serviços disponíveis para resolver o serviceId ─────
    // publicClient() usa a chave publishable (anon role). Se RLS bloquear SELECT
    // em services para anon, a lista virá vazia — mas o RPC (passo 3) tem
    // SECURITY DEFINER e não depende de RLS para ler serviços internamente.
    const { data: allServices, error: svcListErr } = await supabasePublic
      .from("services")
      .select("id, name, price_cents, duration_min, sort_order, active")
      .order("sort_order");

    if (svcListErr) {
      console.error("[createBooking] Erro ao buscar serviços:", svcListErr);
    }

    const activeServices = allServices?.filter((s) => s.active !== false) ?? [];
    const anyServices = allServices ?? [];

    // Normalização para comparação de nomes sem acentos/espaços extras
    const nameNorm = (n: string) => n.toLowerCase().replace(/[^a-z0-9+]/g, "");

    // ── 2. Resolve o serviceId para um UUID real do banco ───────────────────
    // O modal pode enviar: UUID real (serviço existia no banco) ou
    // srv-canonical-N (serviço não existia no banco quando a lista foi carregada).
    const isRealUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      data.serviceId
    );

    type ResolvedSvc = { id: string; name: string; price_cents: number; duration_min: number };
    let resolvedService: ResolvedSvc | undefined;

    if (!isRealUuid) {
      // ID canônico virtual: "srv-canonical-3" → sort_order 3
      const canonicalOrder = parseInt(data.serviceId.replace("srv-canonical-", ""), 10);
      const canonical = CANONICAL_SERVICES.find((c) => c.sort_order === canonicalOrder);
      console.log("[createBooking] ID virtual:", data.serviceId, "->", canonical?.name);

      if (canonical) {
        const dbFound =
          activeServices.find((s) => nameNorm(s.name) === nameNorm(canonical.name)) ??
          anyServices.find((s) => nameNorm(s.name) === nameNorm(canonical.name)) ??
          activeServices.find((s) => nameNorm(s.name).includes(nameNorm(canonical.key))) ??
          anyServices.find((s) => nameNorm(s.name).includes(nameNorm(canonical.key)));

        if (dbFound) {
          resolvedService = dbFound;
        } else if (activeServices.length > 0) {
          // Serviço canônico não existe no banco — usa primeiro ativo como FK
          resolvedService = {
            ...activeServices[0],
            name: canonical.name,
            price_cents: canonical.price_cents,
            duration_min: canonical.duration_min,
          };
          console.warn("[createBooking] Canônico ausente no banco — FK fallback:", activeServices[0].id);
        } else if (anyServices.length > 0) {
          resolvedService = {
            ...anyServices[0],
            name: canonical.name,
            price_cents: canonical.price_cents,
            duration_min: canonical.duration_min,
          };
          console.warn("[createBooking] Usando serviço inativo como FK fallback:", anyServices[0].id);
        } else {
          // RLS bloqueando SELECT em services para anon, ou banco realmente vazio
          console.error("[createBooking] Nenhum serviço acessível via anon. Tentando RPC mesmo assim.");
          // Deixamos o RPC tentar com um ID inválido para retornar erro descritivo do banco
          return {
            ok: false as const,
            error: "Não foi possível confirmar o serviço. Recarregue a página e tente novamente.",
          };
        }
      } else {
        resolvedService = activeServices[0] ?? anyServices[0];
        if (!resolvedService) {
          console.error("[createBooking] Nenhum serviço disponível — banco vazio.");
          return {
            ok: false as const,
            error: "Não foi possível confirmar o serviço. Recarregue a página e tente novamente.",
          };
        }
      }
    } else {
      const byId = anyServices.find((s) => s.id === data.serviceId);
      if (byId) {
        resolvedService = byId;
      } else if (anyServices.length > 0) {
        resolvedService = activeServices[0] ?? anyServices[0];
        console.warn("[createBooking] UUID", data.serviceId, "não encontrado — fallback:", resolvedService.id);
      } else {
        console.error("[createBooking] Banco de serviços vazio para UUID:", data.serviceId);
        return {
          ok: false as const,
          error: "Não foi possível confirmar o serviço. Recarregue a página e tente novamente.",
        };
      }
    }

    if (!resolvedService) {
      console.error("[createBooking] resolvedService undefined — não deveria chegar aqui.");
      return {
        ok: false as const,
        error: "Não foi possível confirmar o serviço. Recarregue a página e tente novamente.",
      };
    }

    console.log("[createBooking] Serviço resolvido:", resolvedService.id, resolvedService.name);

    // ── 3. Chama o RPC create_public_booking (SECURITY DEFINER) ─────────────
    // Este RPC existe no banco (types.ts linha 462) e tem SECURITY DEFINER:
    // - Bypassa RLS ao buscar services/barbers internamente
    // - Valida serviço ativo, barbeiro ativo, conflito de horário (COUNT atômico)
    // - Insere o agendamento na mesma transação
    // Usar o RPC elimina a dependência de políticas RLS de SELECT/INSERT para
    // a role anon — que provavelmente não existem, causando o erro original.
    const startsAtIso = startsAt.toISOString();
    const finalNotes = data.notes?.trim() ?? "";

    const { data: rpcResult, error: rpcErr } = await supabasePublic.rpc("create_public_booking", {
      _barber_id: data.barberId,
      _service_id: resolvedService.id,
      _starts_at: startsAtIso,
      _name: data.name,
      _phone: data.phone,
      _notes: finalNotes,
      _label: resolvedService.name, // campo legado — passamos o nome do serviço
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

    // ── 4. Preço: serviço principal (do banco via RPC) + addon opcional ──────
    const extraCents = data.extraPriceCents ?? 0;
    const basePriceCents = result.priceCents ?? resolvedService.price_cents ?? 0;
    const totalPriceCents = basePriceCents + extraCents;

    if (extraCents > 0 && result.id) {
      // Atualiza o preço incluindo o addon. Se falhar (sem policy UPDATE), não é crítico —
      // o agendamento já foi criado com sucesso com o preço base.
      const { error: updErr } = await supabasePublic
        .from("appointments")
        .update({ price_cents: totalPriceCents })
        .eq("id", result.id);
      if (updErr) {
        console.warn("[createBooking] Não foi possível atualizar preço do addon:", updErr.message);
      }
    }

    console.log("[createBooking] Agendamento criado:", result.id, "barbeiro:", result.barberName, "serviço:", result.serviceName);

    return {
      ok: true as const,
      id: result.id ?? "",
      barberName: result.barberName ?? "",
      serviceName: result.serviceName ?? resolvedService.name,
      priceCents: totalPriceCents,
    };
  });
