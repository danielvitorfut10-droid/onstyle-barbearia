import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildSlots, dayRange, toIntervals, weekdayOf } from "./booking.server";
import { publicClient } from "./supabase-public.server";

const availabilitySchema = z.object({
  barberId: z.string().uuid(),
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const bookingSchema = z.object({
  barberId: z.string().uuid(),
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(10).max(20),
  notes: z.string().trim().max(280).optional().or(z.literal("")),
});

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

  // Garantir a transformação/atualização em tempo de execução dos dados retornados
  barbers = barbers.map((b) => {
    if (b.name.toLowerCase().includes("rian")) {
      return {
        ...b,
        bio: "Especialista em cortes modernos, tradicionais, degrades, acabamento em navalha, barba desenhada e cortes infantis",
      };
    }
    if (b.name.toLowerCase().includes("lemuel")) {
      return {
        ...b,
        bio: "Especialista em cortes modernos, tradicionais, degrades, acabamento em navalha, barba desenhada, desenho e cortes infantis.",
      };
    }
    return b;
  });

  // Serviços vêm direto do cadastro (mesmos dados usados no agendamento e no painel)
  services = services.filter((s) => !s.name.toLowerCase().includes("cavanhaque"));

  services = services.map((s) => {
    if (s.name.toLowerCase() === "barba") {
      return {
        ...s,
        price_cents: 3000,
        description: "barba com acabamento em navalha",
        sort_order: 4,
      };
    }
    if (s.name.toLowerCase() === "corte + barba") {
      return {
        ...s,
        price_cents: 6000,
        sort_order: 5,
      };
    }
    if (s.name.toLowerCase().includes("corte") && s.name.toLowerCase().includes("barba") && s.name.toLowerCase().includes("sobrancelha")) {
      return {
        ...s,
        name: "Corte + barba + sobrancelha",
        price_cents: 7000,
        description: "Combo completo de corte, barba e sobrancelha.",
        sort_order: 6,
      };
    }
    return s;
  });

  // Se o novo serviço ainda não estiver no array de serviços retornados do DB, inserimos
  const hasCombo = services.some((s) =>
    s.name.toLowerCase().includes("corte") &&
    s.name.toLowerCase().includes("barba") &&
    s.name.toLowerCase().includes("sobrancelha")
  );

  if (!hasCombo) {
    services.push({
      id: "srv-combo-70",
      name: "Corte + barba + sobrancelha",
      description: "Combo completo de corte, barba e sobrancelha.",
      price_cents: 7000,
      duration_min: 75,
      sort_order: 6,
    });
  }

  // Ordenar serviços pelo sort_order
  services.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  if (settings) {
    settings = {
      ...settings,
      address: "Rua conselho das sociedades, 475 - Jd yeda",
      maps_url: "https://maps.google.com/maps?q=Rua+conselho+das+sociedades,+475+-+Jd+yeda&t=&z=15&ie=UTF8&iwloc=&output=embed",
    };
  } else {
    settings = {
      shop_name: "Studio Blackout",
      address: "Rua conselho das sociedades, 475 - Jd yeda",
      maps_url: "https://maps.google.com/maps?q=Rua+conselho+das+sociedades,+475+-+Jd+yeda&t=&z=15&ie=UTF8&iwloc=&output=embed",
      phone: "+55 19 92003-7087",
      whatsapp: "5519920037087",
      instagram: "https://www.instagram.com/studio_._blackout/",
      whatsapp_template: "Olá! Fiz um agendamento no Studio Blackout.",
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

    const [{ data: service }, { data: hour }, { data: settings }] = await Promise.all([
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
      db.from("settings").select("slot_interval_min").eq("id", 1).maybeSingle(),
    ]);

    if (!service || !hour || hour.closed) return { slots: [] as { time: string; iso: string }[] };

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
      durationMin: service.duration_min,
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
    const { data: res, error } = await supabasePublic.rpc("create_public_booking", {
      _barber_id: data.barberId,
      _service_id: data.serviceId,
      _starts_at: startsAt.toISOString(),
      _name: data.name,
      _phone: data.phone,
      _notes: data.notes || "",
      _label: `${data.date} ${data.time}`,
    });
    const r = (res ?? {}) as {
      ok?: boolean; error?: string; id?: string; barberName?: string; serviceName?: string; priceCents?: number;
    };
    if (error || !r.ok) {
      if (error) console.error(error);
      return { ok: false as const, error: r.error ?? "Não foi possível concluir o agendamento. Tente novamente." };
    }
    return {
      ok: true as const,
      id: r.id ?? null,
      barberName: r.barberName ?? "",
      serviceName: r.serviceName ?? "",
      priceCents: r.priceCents ?? 0,
    };
  });
