import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock,
  Loader2,
  MessageCircle,
  Scissors,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatBRL, formatDateLong, formatDuration, getTodayDateKey, maskPhone, toDateKey } from "@/lib/format";
import { siteQueryOptions } from "@/lib/queries";
import { getAvailability, createBooking } from "@/lib/public.functions";
import { buildWhatsappLink } from "./whatsapp";

const STEPS = ["Barbeiro", "Serviço", "Data", "Horário", "Dados", "Revisão"];

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

export function BookingModal({ open, onOpenChange }: Props) {
  const { data: site } = useQuery(siteQueryOptions);
  const availabilityFn = useServerFn(getAvailability);
  const createFn = useServerFn(createBooking);

  const [step, setStep] = useState(0);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState<{ whatsappUrl: string } | null>(null);

  const barber = site?.barbers.find((b) => b.id === barberId) ?? null;
  const service = site?.services.find((s) => s.id === serviceId) ?? null;

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setStep(0);
        setBarberId(null);
        setServiceId(null);
        setDate(null);
        setTime(null);
        setName("");
        setPhone("");
        setNotes("");
        setDone(null);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const closedWeekdays = useMemo(
    () => new Set((site?.hours ?? []).filter((h) => h.closed).map((h) => h.weekday)),
    [site],
  );

  const isDateDisabled = (d: Date) => {
    const dKey = toDateKey(d);
    const todayKey = getTodayDateKey();

    if (dKey < todayKey) return true;

    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    const maxKey = toDateKey(maxDate);
    if (dKey > maxKey) return true;

    const weekday = d.getDay();
    return closedWeekdays.has(weekday);
  };

  const slotsQuery = useQuery({
    queryKey: ["availability", barberId, serviceId, date],
    enabled: Boolean(open && barberId && serviceId && date),
    queryFn: () =>
      availabilityFn({ data: { barberId: barberId!, serviceId: serviceId!, date: date! } }),
  });

  const phoneDigits = phone.replace(/\D/g, "");
  const nameValid = name.trim().length >= 2;
  const phoneValid = phoneDigits.length >= 10;

  const mutation = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          barberId: barberId!,
          serviceId: serviceId!,
          date: date!,
          time: time!,
          name: name.trim(),
          phone,
          notes: notes.trim(),
        },
      }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error);
        setTime(null);
        setStep(3);
        slotsQuery.refetch();
        return;
      }
      const url = buildWhatsappLink({
        whatsapp: site?.settings?.whatsapp ?? "",
        template: site?.settings?.whatsapp_template ?? null,
        clientName: name.trim(),
        barberName: result.barberName,
        serviceName: result.serviceName,
        dateLabel: formatDateLong(date!),
        timeLabel: time!,
        priceLabel: formatBRL(result.priceCents),
      });
      setDone({ whatsappUrl: url });
      toast.success("Agendamento confirmado!");
    },
    onError: () => toast.error("Falha de conexão. Tente novamente."),
  });

  const canAdvance =
    (step === 0 && barberId) ||
    (step === 1 && serviceId) ||
    (step === 2 && date) ||
    (step === 3 && time) ||
    (step === 4 && nameValid && phoneValid);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col h-[490px] sm:h-[530px] max-h-[85vh] w-[calc(100vw-2rem)] max-w-md sm:max-w-lg gap-0 overflow-hidden border-border bg-popover p-0 rounded-2xl shadow-2xl">
        <div className="shrink-0 border-b border-border p-4 sm:p-5 bg-card/40">
          <DialogTitle className="font-display text-base sm:text-lg">
            {done ? "Agendamento confirmado" : "Agendar agora"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            {done
              ? "Seu horário já está reservado na agenda."
              : `Etapa ${step + 1} de ${STEPS.length} — ${STEPS[step]}`}
          </DialogDescription>
          {!done && (
            <Progress
              value={((step + 1) / STEPS.length) * 100}
              className="mt-3 h-1.5 bg-secondary"
              aria-label="Progresso do agendamento"
            />
          )}
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 space-y-4">
          {done ? (
            <div className="space-y-5 text-center py-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
                <Check className="h-7 w-7" aria-hidden />
              </div>
              <div className="space-y-1">
                <p className="font-display text-base font-medium">
                  {service?.name} com {barber?.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {date && formatDateLong(date)} às {time}
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <Button asChild size="lg" className="w-full">
                  <a href={done.whatsappUrl} target="_blank" rel="noreferrer">
                    <MessageCircle className="mr-2 h-4 w-4" aria-hidden />
                    Enviar confirmação no WhatsApp
                  </a>
                </Button>
                <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full">
                  Fechar
                </Button>
              </div>
            </div>
          ) : (
            <>
              {step === 0 && (
                <div className="flex flex-col gap-3">
                  {!site
                    ? [0, 1].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
                    : site.barbers.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setBarberId(b.id);
                            setStep(1);
                          }}
                          className={cn(
                            "flex items-center gap-3 sm:gap-4 rounded-xl border border-border bg-card p-3.5 sm:p-4 text-left transition-all hover:border-foreground/40 hover:bg-accent/60 w-full min-w-0",
                            barberId === b.id && "border-foreground bg-accent/80 ring-1 ring-foreground",
                          )}
                        >
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-lg font-bold">
                            {b.name.charAt(0)}
                          </span>
                          <span className="flex-1 min-w-0 overflow-hidden">
                            <span className="block font-display text-sm sm:text-base font-semibold text-foreground truncate">
                              {b.name}
                            </span>
                            <span className="block text-xs text-muted-foreground leading-relaxed whitespace-normal break-words line-clamp-2 mt-0.5">
                              {b.bio}
                            </span>
                          </span>
                          {barberId === b.id && (
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </button>
                      ))}
                </div>
              )}

              {step === 1 && (
                <div className="flex flex-col gap-2.5">
                  {(site?.services ?? [])
                    .filter((s) => s.name.trim().toLowerCase() !== "sobrancelha")
                    .map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setServiceId(s.id);
                        setTime(null);
                        setStep(2);
                      }}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5 sm:p-4 text-left transition-all hover:border-foreground/40 hover:bg-accent/60 w-full min-w-0",
                        serviceId === s.id && "border-foreground bg-accent/80 ring-1 ring-foreground",
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="block font-display text-sm sm:text-base font-medium text-foreground truncate">
                          {s.name}
                        </span>
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          {formatDuration(s.duration_min)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-display text-sm sm:text-base font-semibold text-foreground">
                          {formatBRL(s.price_cents)}
                        </span>
                        {serviceId === s.id && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {step === 2 && (
                <div className="flex flex-col items-center justify-center space-y-3 py-1">
                  <Calendar
                    mode="single"
                    selected={date ? new Date(date + "T12:00:00") : undefined}
                    onSelect={(d) => {
                      if (d) {
                        setDate(toDateKey(d));
                        setTime(null);
                        setStep(3);
                      }
                    }}
                    disabled={isDateDisabled}
                    locale={ptBR}
                    className="rounded-2xl border border-border bg-card p-3 shadow-sm mx-auto pointer-events-auto"
                  />
                  {date && (
                    <p className="text-xs text-center text-muted-foreground">
                      Data selecionada: <span className="font-semibold text-foreground capitalize">{formatDateLong(date)}</span>
                    </p>
                  )}
                </div>
              )}

              {step === 3 && (
                <div>
                  {slotsQuery.isLoading ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full rounded-xl" />
                      ))}
                    </div>
                  ) : (slotsQuery.data?.slots.length ?? 0) === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-sm text-muted-foreground">
                        Nenhum horário livre nesta data. Escolha outro dia.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {slotsQuery.data!.slots.map((s) => (
                        <button
                          key={s.time}
                          type="button"
                          onClick={() => {
                            setTime(s.time);
                            setStep(4);
                          }}
                          className={cn(
                            "rounded-xl border border-border bg-card py-2.5 text-center text-sm font-medium transition-all hover:border-foreground/40",
                            time === s.time && "border-foreground bg-secondary ring-1 ring-foreground font-semibold",
                          )}
                        >
                          {s.time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="booking-name" className="text-sm font-medium">Nome completo</Label>
                    <Input
                      id="booking-name"
                      value={name}
                      maxLength={80}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome"
                      className="w-full"
                      aria-invalid={name.length > 0 && !nameValid}
                    />
                    {name.length > 0 && !nameValid && (
                      <p className="text-xs text-destructive">Informe pelo menos 2 caracteres.</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="booking-phone" className="text-sm font-medium">WhatsApp</Label>
                    <Input
                      id="booking-phone"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(maskPhone(e.target.value))}
                      placeholder="(19) 90000-0000"
                      className="w-full"
                      aria-invalid={phone.length > 0 && !phoneValid}
                    />
                    {phone.length > 0 && !phoneValid && (
                      <p className="text-xs text-destructive">Informe DDD + número.</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="booking-notes" className="text-sm font-medium">Observações (opcional)</Label>
                    <Textarea
                      id="booking-notes"
                      value={notes}
                      maxLength={280}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Alguma preferência?"
                      className="w-full min-h-[80px] resize-none"
                    />
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-2.5">
                  <ReviewRow icon={<User className="h-4 w-4" />} label="Barbeiro" value={barber?.name ?? ""} />
                  <ReviewRow
                    icon={<Scissors className="h-4 w-4" />}
                    label="Serviço"
                    value={`${service?.name} • ${formatBRL(service?.price_cents ?? 0)}`}
                  />
                  <ReviewRow
                    icon={<CalendarDays className="h-4 w-4" />}
                    label="Data"
                    value={date ? formatDateLong(date) : ""}
                  />
                  <ReviewRow icon={<Clock className="h-4 w-4" />} label="Horário" value={time ?? ""} />
                  <ReviewRow icon={<User className="h-4 w-4" />} label="Cliente" value={`${name} • ${phone}`} />
                </div>
              )}
            </>
          )}
        </div>

        {!done && (
          <div className="shrink-0 border-t border-border p-4 sm:p-5 bg-card/40 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="default"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || mutation.isPending}
              className="gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Voltar
            </Button>
            {step === 5 ? (
              <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="flex-1 sm:flex-initial">
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                Confirmar agendamento
              </Button>
            ) : (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance} className="min-w-[110px]">
                Continuar
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReviewRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 sm:p-3.5 min-w-0">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1 overflow-hidden">
        <span className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {label}
        </span>
        <span className="block truncate text-sm font-medium text-foreground">{value}</span>
      </span>
    </div>
  );
}
