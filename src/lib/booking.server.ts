import { toIso } from "./format";

export type Slot = { time: string; iso: string };

type Interval = { start: number; end: number };

export function weekdayOf(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
}

function minutesOf(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Gera os horários livres de um barbeiro em um dia, considerando
 * funcionamento, duração do serviço, agendamentos e bloqueios.
 */
export function buildSlots(params: {
  dateStr: string;
  openTime: string;
  closeTime: string;
  intervalMin: number;
  durationMin: number;
  busy: Interval[];
  unblockedNightStarts?: number[];
  unblockedStarts?: number[];
  now?: Date;
}): Slot[] {
  const { dateStr, openTime, intervalMin, durationMin, busy } = params;
  const unblockedStarts = params.unblockedStarts ?? params.unblockedNightStarts ?? [];
  const now = params.now ?? new Date();
  // Antecedência mínima de 10 minutos para agendamentos no mesmo dia
  const minStart = now.getTime() + 10 * 60 * 1000;

  const open = minutesOf(openTime);
  // Start loop from 06:00 AM (360 min) or open time, whichever is earlier
  const startLoop = Math.min(open, 6 * 60);
  // Extend closing time to 23:59 to allow slots up to 00:00 (midnight)
  const close = Math.max(minutesOf(params.closeTime), 23 * 60 + 59);
  const slots: Slot[] = [];

  for (let m = startLoop; m + durationMin <= close; m += intervalMin) {
    const time = `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
    const iso = toIso(dateStr, time);
    const start = new Date(iso).getTime();
    const end = start + durationMin * 60 * 1000;
    if (start < minStart) continue;

    // Slots before open time (< open, e.g. 06:00-09:00) OR from 19:00 onwards (>= 1140)
    // are blocked by default unless explicitly unblocked (reason = 'desbloqueado')
    if (m < open || m >= 1140) {
      const isUnblocked = unblockedStarts.some((t) => Math.abs(t - start) < 60000);
      if (!isUnblocked) continue;
    }

    // Bloqueia apenas o horário exatamente selecionado (mesmo início),
    // sem derrubar os horários seguintes.
    const conflict = busy.some((b) => Math.abs(b.start - start) < 60000);
    if (!conflict) slots.push({ time, iso });
  }

  return slots;
}

export function toIntervals(rows: { starts_at: string; ends_at: string }[]): Interval[] {
  return rows.map((r) => ({
    start: new Date(r.starts_at).getTime(),
    end: new Date(r.ends_at).getTime(),
  }));
}

export function dayRange(dateStr: string) {
  const start = toIso(dateStr, "00:00");
  const [y, m, d] = dateStr.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1, 12));
  const nextStr = `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
  return { start, end: toIso(nextStr, "00:00") };
}

export function buildWhatsappMessage(input: {
  template: string | null;
  clientName: string;
  barberName: string;
  serviceName: string;
  dateLabel: string;
  timeLabel: string;
  priceLabel: string;
}) {
  const base = input.template?.trim() || "Olá! Fiz um agendamento no Studio Blackout.";
  return [
    base,
    "",
    `Cliente: ${input.clientName}`,
    `Barbeiro: ${input.barberName}`,
    `Serviço: ${input.serviceName}`,
    `Data: ${input.dateLabel}`,
    `Horário: ${input.timeLabel}`,
    `Valor: ${input.priceLabel}`,
  ].join("\n");
}
