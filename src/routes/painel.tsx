import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  CalendarDays,
  TrendingUp,
  Users,
  DollarSign,
  LogOut,
  Scissors,
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
  Clock,
  CheckCircle2,
  X,
  Loader2,
  BarChart3,
  Calendar,
  MessageCircle,
  Search,
  XCircle,
  ChevronDown,
  User,
  AlertTriangle,
  Phone,
  Plus,
  Pencil,
  Trash2,
  ShoppingBag,
  Receipt,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  parseISO,
  isWithinInterval,
  isBefore,
  isAfter,
  startOfDay,
  endOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useBarberAuth } from "@/hooks/use-barber-auth";
import { formatBRL } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/painel")({
  head: () => ({
    meta: [{ title: "Painel do Barbeiro — Studio Blackout" }],
  }),
  component: PainelPage,
});

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Tab = "receita" | "agendamentos" | "clientes" | "gastos";

interface Expense {
  id: string;
  barber_id: string;
  item_name: string;
  amount_cents: number;
  expense_date: string;
  notes?: string | null;
  created_at: string;
}

interface Appointment {
  id: string;
  service_id?: string | null;
  client_name: string;
  client_phone: string;
  starts_at: string;
  ends_at: string;
  price_cents: number;
  status: string;
  notes?: string | null;
  services: { name: string } | null;
  barbers?: { name: string } | null;
}

interface BlockedSlot {
  id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
function PainelPage() {
  const { user, barber, role, loading, isAuthorized, signOut } = useBarberAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("receita");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [gastosModalOpen, setGastosModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Disable pinch/double-tap zoom on mobile while the panel is open
  useEffect(() => {
    const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    const original = viewport?.getAttribute("content") ?? null;
    viewport?.setAttribute(
      "content",
      "width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover",
    );
    return () => {
      if (viewport && original !== null) viewport.setAttribute("content", original);
    };
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  // Redirect if not authorized
  useEffect(() => {
    if (!loading && !isAuthorized) {
      router.navigate({ to: "/" });
    }
  }, [loading, isAuthorized, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-[#39ff14]" />
      </div>
    );
  }

  if (!isAuthorized) return null;

  const displayName = barber?.name ?? user?.email ?? "Barbeiro";
  const initial = (barber?.name ?? user?.email ?? "B").charAt(0).toUpperCase();

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await signOut();
    router.navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Top nav */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 sm:px-4 sm:py-3">

          {/* Left: User Avatar Button + Dropdown Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-xl p-1 transition-colors hover:bg-zinc-900 focus:outline-none"
              aria-label="Menu do usuário"
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#39ff14] text-black font-extrabold text-base shadow-lg shadow-[#39ff14]/20 select-none"
              >
                {initial}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-[10px] text-zinc-500 leading-none">Studio Blackout</p>
                <p className="text-sm font-bold text-white leading-tight">{displayName}</p>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-zinc-400 transition-transform ${
                  userMenuOpen ? "rotate-180 text-[#39ff14]" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <div className="absolute left-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/98 p-2 shadow-2xl backdrop-blur-xl">
                <div className="border-b border-zinc-800 px-3 py-2">
                  <p className="text-xs font-bold text-white truncate">{displayName}</p>
                  <p className="text-[11px] text-zinc-500 truncate">{user?.email}</p>
                  {role === "admin" && (
                    <span className="mt-1.5 inline-block rounded-full bg-[#39ff14]/10 border border-[#39ff14]/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#39ff14]">
                      Administrador
                    </span>
                  )}
                </div>
                <div className="pt-1">
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair da conta
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Center/Right: Tabs & Green Adicionar Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <nav className="flex gap-1 sm:gap-2">
              <TabButton active={activeTab === "receita"} onClick={() => setActiveTab("receita")}>
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Receita</span>
              </TabButton>
              <TabButton active={activeTab === "agendamentos"} onClick={() => setActiveTab("agendamentos")}>
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">Agenda</span>
              </TabButton>
              <TabButton active={activeTab === "clientes"} onClick={() => setActiveTab("clientes")}>
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Clientes</span>
              </TabButton>
              <TabButton active={activeTab === "gastos"} onClick={() => setActiveTab("gastos")}>
                <Receipt className="h-4 w-4" />
                <span className="hidden sm:inline">Gastos</span>
              </TabButton>
            </nav>

            {/* Green: Adicionar Atendimento */}
            <button
              id="admin-add-appointment-btn"
              onClick={() => setAddModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 sm:px-4 sm:py-2 text-xs shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
              title="Adicionar Atendimento"
            >
              <Plus className="h-4 w-4" />
              <span>Adicionar</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8">
        {activeTab === "receita" && <ReceitaTab barber={barber} role={role} onOpenAddModal={() => setAddModalOpen(true)} />}
        {activeTab === "agendamentos" && <AgendamentosTab barber={barber} role={role} onOpenAddModal={() => setAddModalOpen(true)} />}
        {activeTab === "clientes" && <ClientesTab barber={barber} role={role} onOpenAddModal={() => setAddModalOpen(true)} />}
        {activeTab === "gastos" && (
          <GastosTab
            barber={barber}
            role={role}
            onOpenAddModal={() => {
              setEditingExpense(null);
              setGastosModalOpen(true);
            }}
            onEditExpense={(exp) => {
              setEditingExpense(exp);
              setGastosModalOpen(true);
            }}
          />
        )}
      </main>

      {addModalOpen && (
        <AddAppointmentModal
          barber={barber}
          role={role}
          onClose={() => setAddModalOpen(false)}
        />
      )}

      {gastosModalOpen && (
        <GastosModal
          barber={barber}
          role={role}
          initialExpense={editingExpense}
          onClose={() => {
            setGastosModalOpen(false);
            setEditingExpense(null);
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Tab Button
// ─────────────────────────────────────────────
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
        active
          ? "bg-[#39ff14]/10 text-[#39ff14] border border-[#39ff14]/30"
          : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
      }`}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────
// Mini Calendar Date-Range Picker
// ─────────────────────────────────────────────
interface DateRange {
  from: Date;
  to: Date;
}

function MiniCalendarPicker({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date());
  const [selecting, setSelecting] = useState<Date | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const calStart = startOfWeek(startOfMonth(pickerMonth), { weekStartsOn: 0 });
  const calEnd = endOfWeek(endOfMonth(pickerMonth), { weekStartsOn: 0 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  function handleDayClick(day: Date) {
    if (!selecting) {
      setSelecting(day);
    } else {
      const from = isBefore(day, selecting) ? day : selecting;
      const to = isAfter(day, selecting) ? day : selecting;
      onChange({ from: startOfDay(from), to: endOfDay(to) });
      setSelecting(null);
      setOpen(false);
    }
  }

  const formatRange = (r: DateRange) => {
    if (isSameDay(r.from, r.to)) return format(r.from, "dd/MM/yyyy");
    if (isSameMonth(r.from, r.to))
      return `${format(r.from, "dd")} – ${format(r.to, "dd/MM/yyyy")}`;
    return `${format(r.from, "dd/MM")} – ${format(r.to, "dd/MM/yyyy")}`;
  };

  function setPreset(preset: "hoje" | "semana" | "mes") {
    const now = new Date();
    if (preset === "hoje") onChange({ from: startOfDay(now), to: endOfDay(now) });
    else if (preset === "semana") {
      onChange({
        from: startOfDay(startOfWeek(now, { weekStartsOn: 1 })),
        to: endOfDay(endOfWeek(now, { weekStartsOn: 1 })),
      });
    } else {
      onChange({ from: startOfDay(startOfMonth(now)), to: endOfDay(endOfMonth(now)) });
    }
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
          open
            ? "border-[#39ff14]/50 bg-[#39ff14]/10 text-[#39ff14]"
            : "border-zinc-700 bg-zinc-900/50 text-zinc-300 hover:border-zinc-500 hover:text-white"
        }`}
      >
        <Calendar className="h-3.5 w-3.5" />
        <span>{formatRange(value)}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-72 rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/60 overflow-hidden">
          {/* Preset shortcuts */}
          <div className="flex gap-1 border-b border-zinc-800 p-2">
            {(["hoje", "semana", "mes"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className="flex-1 rounded-md py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-400 transition-all hover:bg-[#39ff14]/10 hover:text-[#39ff14]"
              >
                {p === "hoje" ? "Hoje" : p === "semana" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>

          {/* Month nav */}
          <div className="flex items-center justify-between px-3 py-2">
            <button
              onClick={() => setPickerMonth((m) => subMonths(m, 1))}
              className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:text-white"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs font-bold uppercase tracking-widest text-white">
              {format(pickerMonth, "MMM yyyy", { locale: ptBR })}
            </span>
            <button
              onClick={() => setPickerMonth((m) => addMonths(m, 1))}
              className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:text-white"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 px-2">
            {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
              <div key={i} className="py-1 text-center text-[9px] font-bold uppercase text-zinc-600">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-0.5 px-2 pb-3">
            {calDays.map((day) => {
              const inMonth = isSameMonth(day, pickerMonth);
              const isFrom = isSameDay(day, value.from);
              const isTo = isSameDay(day, value.to);
              const inRange =
                isWithinInterval(day, { start: value.from, end: value.to }) && !isFrom && !isTo;
              const today = isToday(day);
              const isSelectingFrom = selecting && isSameDay(day, selecting);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDayClick(day)}
                  className={`rounded-lg py-1.5 text-[11px] font-semibold transition-all ${
                    !inMonth
                      ? "text-zinc-700"
                      : isFrom || isTo || isSelectingFrom
                        ? "bg-[#39ff14] text-black shadow-sm shadow-[#39ff14]/30"
                        : inRange
                          ? "bg-[#39ff14]/15 text-[#39ff14]"
                          : today
                            ? "text-[#39ff14] font-bold"
                            : "text-zinc-300 hover:bg-zinc-700/60"
                  }`}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          {selecting && (
            <p className="px-3 pb-3 text-center text-[10px] text-zinc-500">
              Agora clique no dia final do período
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Receita Tab
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// Receita Tab
// ─────────────────────────────────────────────
function ReceitaTab({
  barber,
  role,
  onOpenAddModal,
}: {
  barber: { id: string } | null;
  role: string | null;
  onOpenAddModal?: () => void;
}) {
  const now = new Date();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(startOfMonth(now)),
    to: endOfDay(endOfMonth(now)),
  });

  // Fetch appointments from Supabase
  const { data: appointments = [], isLoading: isLoadingAppts } = useQuery({
    queryKey: ["barber-appointments", barber?.id, role],
    queryFn: async () => {
      let q = supabase
        .from("appointments")
        .select("id, client_name, client_phone, starts_at, ends_at, price_cents, status, services(name)")
        .neq("status", "cancelado")
        .order("starts_at", { ascending: false });

      if (barber?.id) {
        q = q.eq("barber_id", barber.id);
      }

      const { data } = await q;
      return (data ?? []) as Appointment[];
    },
    enabled: role !== null && !!barber?.id,
  });

  // Fetch expenses from Supabase
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses-receita", barber?.id, role],
    queryFn: async () => {
      let q = supabase
        .from("expenses")
        .select("id, barber_id, item_name, amount_cents, expense_date");
      if (barber?.id) {
        q = q.eq("barber_id", barber.id);
      }
      const { data, error } = await q;
      if (error) return [];
      return (data ?? []) as Expense[];
    },
    enabled: role !== null && !!barber?.id,
  });

  // Filter appointments by selected date range
  const filtered = appointments.filter((a) => {
    const d = parseISO(a.starts_at);
    return d >= dateRange.from && d <= dateRange.to;
  });

  const rawTotalCents = filtered.reduce((s, a) => s + a.price_cents, 0);
  const totalCount = filtered.length;

  const todayAppointments = appointments.filter((a) => isToday(parseISO(a.starts_at)));
  const rawTodayCents = todayAppointments.reduce((s, a) => s + a.price_cents, 0);

  // Range and today expenses
  const rangeExpenses = expenses.filter((e) => {
    const d = parseISO(e.expense_date);
    return d >= dateRange.from && d <= dateRange.to;
  });
  const rangeExpensesCents = rangeExpenses.reduce((s, e) => s + e.amount_cents, 0);

  const todayExpenses = expenses.filter((e) => isToday(parseISO(e.expense_date)));
  const todayExpensesCents = todayExpenses.reduce((s, e) => s + e.amount_cents, 0);

  // Net Revenue (subtracting expenses)
  const netTotalCents = Math.max(0, rawTotalCents - rangeExpensesCents);
  const netTodayCents = Math.max(0, rawTodayCents - todayExpensesCents);

  // Chart: all days in selected range
  const rangeDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
  const chartDays = rangeDays.map((d) => {
    const label = format(d, "dd/MM");
    const dayAppts = appointments.filter((a) => isSameDay(parseISO(a.starts_at), d));
    const dayApptsCents = dayAppts.reduce((s, a) => s + a.price_cents, 0);
    const dayExp = expenses.filter((e) => isSameDay(parseISO(e.expense_date), d));
    const dayExpCents = dayExp.reduce((s, e) => s + e.amount_cents, 0);
    const netDayCents = Math.max(0, dayApptsCents - dayExpCents);
    return { label, receita: netDayCents / 100, count: dayAppts.length };
  });

  const periodLabel = isSameDay(dateRange.from, dateRange.to)
    ? format(dateRange.from, "dd/MM/yyyy")
    : `${format(dateRange.from, "dd/MM")} – ${format(dateRange.to, "dd/MM")}`;

  return (
    <div className="space-y-6">
      {/* Header + date picker & green Adicionar button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-white sm:text-2xl">Receita</h1>
        <div className="flex items-center gap-2">
          {onOpenAddModal && (
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 text-xs shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Adicionar</span>
            </button>
          )}
          <MiniCalendarPicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard
          label="Receita Líquida"
          value={formatBRL(netTotalCents)}
          icon={<DollarSign className="h-5 w-5" />}
          accent
        />
        <SummaryCard
          label="Atendimentos"
          value={String(totalCount)}
          icon={<Users className="h-5 w-5" />}
        />
        <SummaryCard
          label="Receita do Dia"
          value={formatBRL(netTodayCents)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
        <h2 className="mb-5 text-xs font-semibold uppercase tracking-wide text-zinc-400 sm:text-sm">
          Receita por dia — {periodLabel}
        </h2>
        {isLoadingAppts ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#39ff14]" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartDays} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: "#71717a", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `R$${v}`}
              />
              <Tooltip
                cursor={{ fill: "rgba(57,255,20,0.05)" }}
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, color: "#fff" }}
                formatter={(v: number) => [`R$ ${v.toFixed(2)}`, "Receita Líquida"]}
              />
              <Bar dataKey="receita" fill="#39ff14" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent appointments */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Últimos Atendimentos
        </h2>
        {isLoadingAppts ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#39ff14]" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-zinc-600 py-8">Nenhum atendimento neste período.</p>
        ) : (
          <div className="space-y-2">
            {filtered.slice(0, 10).map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
                    <Scissors className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{a.client_name}</p>
                    <p className="text-xs text-zinc-500">
                      {a.services?.name} •{" "}
                      {format(parseISO(a.starts_at), "dd/MM HH:mm")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#39ff14]">{formatBRL(a.price_cents)}</p>
                  <StatusBadge status={a.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 sm:p-6 ${
        accent
          ? "border-[#39ff14]/20 bg-[#39ff14]/5"
          : "border-zinc-800 bg-zinc-900/50"
      }`}
    >
      <div
        className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl sm:mb-3 sm:h-10 sm:w-10 ${
          accent ? "bg-[#39ff14]/15 text-[#39ff14]" : "bg-zinc-800 text-zinc-400"
        }`}
      >
        {icon}
      </div>
      <p className="text-[10px] text-zinc-500 uppercase tracking-wide sm:text-xs">{label}</p>
      <p className={`mt-1 text-lg font-bold sm:text-2xl ${accent ? "text-[#39ff14]" : "text-white"}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    agendado: { label: "Agendado", cls: "text-blue-400" },
    confirmado: { label: "Confirmado", cls: "text-emerald-400" },
    concluido: { label: "Concluído", cls: "text-[#39ff14]" },
    cancelado: { label: "Cancelado", cls: "text-red-400" },
    nao_compareceu: { label: "Faltou", cls: "text-yellow-500" },
  };
  const s = map[status] ?? { label: status, cls: "text-zinc-400" };
  return <p className={`text-xs font-medium ${s.cls}`}>{s.label}</p>;
}

// ─────────────────────────────────────────────
// Tab: Histórico de Gastos da Barbearia
// ─────────────────────────────────────────────
function GastosTab({
  barber,
  role,
  onOpenAddModal,
  onEditExpense,
}: {
  barber: { id: string; name?: string } | null;
  role: string | null;
  onOpenAddModal: () => void;
  onEditExpense: (exp: Expense) => void;
}) {
  const queryClient = useQueryClient();
  const [filterMonth, setFilterMonth] = useState(format(new Date(), "yyyy-MM"));
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Barbers list (for admin)
  const { data: barbers = [] } = useQuery({
    queryKey: ["active-barbers-gastos"],
    queryFn: async () => {
      const { data } = await supabase.from("barbers").select("id, name").eq("active", true).order("sort_order");
      return data ?? [];
    },
    enabled: role === "admin",
  });
  const [selectedBarberId, setSelectedBarberId] = useState(barber?.id ?? "");
  useEffect(() => {
    if (!selectedBarberId && barber?.id) setSelectedBarberId(barber.id);
    else if (!selectedBarberId && barbers.length > 0) setSelectedBarberId(barbers[0].id);
  }, [barber, barbers, selectedBarberId]);

  const targetBarberId = role === "admin" ? selectedBarberId : barber?.id;

  // Fetch expenses for the chosen month from Supabase
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses", targetBarberId, filterMonth],
    queryFn: async () => {
      if (!targetBarberId) return [];
      const from = `${filterMonth}-01`;
      const lastDay = new Date(parseInt(filterMonth.split("-")[0]), parseInt(filterMonth.split("-")[1]), 0).getDate();
      const to = `${filterMonth}-${String(lastDay).padStart(2, "0")}`;
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("barber_id", targetBarberId)
        .gte("expense_date", from)
        .lte("expense_date", to)
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Expense[];
    },
    enabled: !!targetBarberId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expenses-receita"] });
      setDeletingId(null);
      toast.success("Gasto removido com sucesso.");
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao remover gasto."),
  });

  const filteredExpenses = expenses.filter((e) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      e.item_name.toLowerCase().includes(term) ||
      (e.notes && e.notes.toLowerCase().includes(term))
    );
  });

  const totalExpensesCents = filteredExpenses.reduce((sum, e) => sum + e.amount_cents, 0);

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">Histórico de Gastos</h1>
          <p className="text-xs text-zinc-500 sm:text-sm">Gerencie o registro e o histórico de despesas da barbearia</p>
        </div>
        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 text-xs shadow-lg shadow-red-600/20 active:scale-95 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Adicionar Gasto</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wide">Total em Gastos no Mês</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600/20 text-red-400">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-red-400">{formatBRL(totalExpensesCents)}</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Total de Lançamentos</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-white">{filteredExpenses.length}</p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-zinc-400">Mês:</label>
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-white focus:border-red-500/50 focus:outline-none"
          />
        </div>

        {role === "admin" && barbers.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-zinc-400">Barbeiro:</label>
            <select
              value={selectedBarberId}
              onChange={(e) => setSelectedBarberId(e.target.value)}
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-white focus:border-red-500/50 focus:outline-none"
            >
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por item ou observação..."
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 py-1.5 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:border-red-500/50 focus:outline-none"
          />
        </div>
      </div>

      {/* Expense History List */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Gastos Registrados ({filteredExpenses.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="flex h-36 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-red-400" />
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600/10 border border-red-600/20 text-red-400 mb-3">
              <Receipt className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-white">Nenhum gasto encontrado</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm">
              Nenhuma despesa foi registrada para os filtros selecionados.
            </p>
            <button
              onClick={onOpenAddModal}
              className="mt-4 flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 text-xs shadow-lg shadow-red-600/20 active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Adicionar Primeiro Gasto</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredExpenses.map((exp) => (
              <div
                key={exp.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/70 p-3.5 sm:p-4 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600/10 border border-red-600/20 text-red-400">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{exp.item_name}</p>
                    <p className="text-xs text-zinc-400 flex items-center gap-2 flex-wrap">
                      <span>{format(parseISO(exp.expense_date), "dd/MM/yyyy")}</span>
                      {exp.notes && (
                        <span className="text-zinc-500 truncate max-w-xs">• {exp.notes}</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <p className="text-sm sm:text-base font-extrabold text-red-400">
                    -{formatBRL(exp.amount_cents)}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      title="Editar"
                      onClick={() => onEditExpense(exp)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-[#39ff14] transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {deletingId === exp.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          title="Confirmar exclusão"
                          onClick={() => deleteMutation.mutate(exp.id)}
                          disabled={deleteMutation.isPending}
                          className="rounded-lg px-2 py-1 text-[10px] font-bold bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50"
                        >
                          {deleteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Sim"}
                        </button>
                        <button
                          title="Cancelar"
                          onClick={() => setDeletingId(null)}
                          className="rounded-lg px-2 py-1 text-[10px] font-bold bg-zinc-700 hover:bg-zinc-600 text-white transition-colors"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        title="Excluir"
                        onClick={() => setDeletingId(exp.id)}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Modal: Adicionar / Editar Gasto (Popup)
// ─────────────────────────────────────────────
function GastosModal({
  barber,
  role,
  initialExpense,
  onClose,
}: {
  barber: { id: string; name?: string } | null;
  role: string | null;
  initialExpense?: Expense | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const [itemName, setItemName] = useState(initialExpense?.item_name ?? "");
  const [amountInput, setAmountInput] = useState(
    initialExpense ? (initialExpense.amount_cents / 100).toFixed(2).replace(".", ",") : ""
  );
  const [expenseDate, setExpenseDate] = useState(
    initialExpense?.expense_date ?? format(new Date(), "yyyy-MM-dd")
  );
  const [notes, setNotes] = useState(initialExpense?.notes ?? "");

  // Barbers list (for admin)
  const { data: barbers = [] } = useQuery({
    queryKey: ["active-barbers-gastos"],
    queryFn: async () => {
      const { data } = await supabase.from("barbers").select("id, name").eq("active", true).order("sort_order");
      return data ?? [];
    },
    enabled: role === "admin",
  });
  const [selectedBarberId, setSelectedBarberId] = useState(
    initialExpense?.barber_id ?? barber?.id ?? ""
  );
  useEffect(() => {
    if (!selectedBarberId && barber?.id) setSelectedBarberId(barber.id);
    else if (!selectedBarberId && barbers.length > 0) setSelectedBarberId(barbers[0].id);
  }, [barber, barbers, selectedBarberId]);

  const targetBarberId = role === "admin" ? selectedBarberId : barber?.id;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!itemName.trim()) throw new Error("Informe o nome do item.");
      const cleanAmt = amountInput.replace(/[^\d,.]/g, "").replace(",", ".");
      const parsedAmt = parseFloat(cleanAmt);
      if (Number.isNaN(parsedAmt) || parsedAmt <= 0) throw new Error("Informe um valor válido.");
      const amountCents = Math.round(parsedAmt * 100);
      const bId = targetBarberId;
      if (!bId) throw new Error("Barbeiro não identificado.");

      if (initialExpense) {
        const { error } = await supabase
          .from("expenses")
          .update({
            item_name: itemName.trim(),
            amount_cents: amountCents,
            expense_date: expenseDate,
            notes: notes.trim() || null,
          })
          .eq("id", initialExpense.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("expenses").insert({
          barber_id: bId,
          item_name: itemName.trim(),
          amount_cents: amountCents,
          expense_date: expenseDate,
          notes: notes.trim() || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expenses-receita"] });
      toast.success(initialExpense ? "Gasto atualizado!" : "Gasto registrado com sucesso!");
      onClose();
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao salvar gasto."),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/10 border border-red-600/20 text-red-400">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {initialExpense ? "Editar Gasto" : "Novo Gasto"}
              </h2>
              <p className="text-xs text-zinc-400">Preencha os dados do gasto da barbearia</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="p-5 space-y-4"
        >
          {role === "admin" && barbers.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Barbeiro *</label>
              <select
                value={selectedBarberId}
                onChange={(e) => setSelectedBarberId(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-red-500/50 focus:outline-none"
              >
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Nome do Item *</label>
            <input
              type="text"
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Ex: Aluguel, Produtos de higiene, Lâmpada..."
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-red-500/50 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Valor (R$) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-zinc-400 font-bold text-sm">R$</span>
                <input
                  type="text"
                  required
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 py-2 pl-10 pr-3 text-sm font-bold text-white focus:border-red-500/50 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Data *</label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-red-500/50 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Observação (Opcional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Nota fiscal #123"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-red-500/50 focus:outline-none"
            />
          </div>

          <div className="flex gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 py-2.5 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-600/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span>{initialExpense ? "Salvar Alterações" : "Adicionar Gasto"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────
// Agendamentos Tab
// ─────────────────────────────────────────────
function AgendamentosTab({
  barber,
  role,
  onOpenAddModal,
}: {
  barber: { id: string; name: string } | null;
  role: string | null;
  onOpenAddModal?: () => void;
}) {
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

  // Load appointments and blocked slots for the current month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { data: appointments = [] } = useQuery({
    queryKey: ["painel-appointments", format(currentMonth, "yyyy-MM"), barber?.id, role],
    queryFn: async () => {
      let q = supabase
        .from("appointments")
        .select("id, starts_at, ends_at, client_name, status, services(name)")
        .neq("status", "cancelado")
        .gte("starts_at", monthStart.toISOString())
        .lt("starts_at", monthEnd.toISOString());

      if (barber?.id) q = q.eq("barber_id", barber.id);
      const { data } = await q;
      return data ?? [];
    },
    enabled: role !== null && !!barber?.id,
  });

  const { data: blockedSlots = [] } = useQuery({
    queryKey: ["painel-blocked", format(currentMonth, "yyyy-MM"), barber?.id, role],
    queryFn: async () => {
      let q = supabase
        .from("blocked_slots")
        .select("id, starts_at, ends_at, reason")
        .gte("starts_at", monthStart.toISOString())
        .lt("starts_at", monthEnd.toISOString());

      if (barber?.id) q = q.eq("barber_id", barber.id);
      const { data } = await q;
      return (data ?? []) as BlockedSlot[];
    },
    enabled: role !== null && !!barber?.id,
  });

  // Business hours for selected day
  const { data: businessHours } = useQuery({
    queryKey: ["business-hours"],
    queryFn: async () => {
      const { data } = await supabase.from("business_hours").select("*").order("weekday");
      return data ?? [];
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["settings-slot"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("slot_interval_min").eq("id", 1).maybeSingle();
      return data;
    },
  });

  // Block mutation
  const blockMutation = useMutation({
    mutationFn: async ({ startsAt, endsAt, reason }: { startsAt: string; endsAt: string; reason?: string }) => {
      if (!barber?.id) throw new Error("Barbeiro não encontrado.");
      const { error } = await supabase.from("blocked_slots").insert({
        barber_id: barber.id,
        starts_at: startsAt,
        ends_at: endsAt,
        reason: reason ?? "Bloqueado pelo barbeiro",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["painel-blocked"] });
      queryClient.invalidateQueries({ queryKey: ["site-data"] });
      toast.success("Horário atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar horário."),
  });

  const unblockMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blocked_slots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["painel-blocked"] });
      queryClient.invalidateQueries({ queryKey: ["site-data"] });
      toast.success("Horário atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar horário."),
  });

  // Calendar days
  const calStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
  const calEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  // For selected day — build time slots starting from 06:00 AM up to 00:00 (midnight)
  const selectedDaySlots = (() => {
    if (!selectedDay) return [];
    const weekday = selectedDay.getDay();
    const hours = businessHours?.find((h) => h.weekday === weekday);
    if (!hours || hours.closed) return [];

    const interval = 60;
    const [openH] = hours.open_time.slice(0, 5).split(":").map(Number);

    const slots: { time: string; iso: string; isNight: boolean; isEarly: boolean }[] = [];
    let h = 6;
    let m = 0;
    // Extend closing time to 23:59 so 23:30 slot ending at 00:00 is generated
    while (h * 60 + m < 23 * 60 + 59) {
      const iso = new Date(
        selectedDay.getFullYear(),
        selectedDay.getMonth(),
        selectedDay.getDate(),
        h,
        m
      ).toISOString();
      slots.push({
        time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
        iso,
        isNight: h >= 19,
        isEarly: h < openH,
      });
      m += interval;
      if (m >= 60) {
        h += Math.floor(m / 60);
        m = m % 60;
      }
      if (h >= 24) break;
    }
    return slots;
  })();

  // Day dot indicators
  function getDayInfo(day: Date) {
    const booked = appointments.filter((a) => isSameDay(parseISO(a.starts_at), day));
    const blocked = blockedSlots.filter((b) => isSameDay(parseISO(b.starts_at), day));
    return { booked: booked.length, blocked: blocked.length };
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Agendamentos</h1>
          <p className="text-xs text-zinc-500 sm:text-sm">Clique em um dia para gerenciar os horários</p>
        </div>
        {onOpenAddModal && (
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 text-xs shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Adicionar Atendimento</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        {/* Calendar */}
        <div className="lg:col-span-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          {/* Month nav */}
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="text-sm font-bold uppercase tracking-widest text-white">
              {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            </h2>
            <button
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="mb-2 grid grid-cols-7 text-center">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {calDays.map((day) => {
              const { booked, blocked } = getDayInfo(day);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  className={`relative flex flex-col items-center gap-0.5 rounded-xl py-2 text-sm font-medium transition-all ${
                    !isCurrentMonth
                      ? "text-zinc-700 hover:bg-zinc-800/30"
                      : isSelected
                        ? "bg-[#39ff14] text-black shadow-lg shadow-[#39ff14]/20"
                        : today
                          ? "border border-[#39ff14]/40 bg-[#39ff14]/5 text-[#39ff14]"
                          : "text-zinc-300 hover:bg-zinc-800/60"
                  }`}
                >
                  <span>{format(day, "d")}</span>
                  {/* Dots */}
                  {isCurrentMonth && (booked > 0 || blocked > 0) && (
                    <div className="flex gap-0.5">
                      {booked > 0 && (
                        <span
                          className={`h-1 w-1 rounded-full ${isSelected ? "bg-black/60" : "bg-emerald-400"}`}
                        />
                      )}
                      {blocked > 0 && (
                        <span
                          className={`h-1 w-1 rounded-full ${isSelected ? "bg-black/60" : "bg-red-400"}`}
                        />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Agendado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-400" /> Bloqueado
            </span>
          </div>
        </div>

        {/* Day slots panel */}
        <div className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          {!selectedDay ? (
            <div className="flex h-full items-center justify-center text-zinc-600">
              <p className="text-sm">Selecione um dia no calendário</p>
            </div>
          ) : (
            <>
              <h3 className="mb-1 text-sm font-bold text-white">
                {format(selectedDay, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </h3>

              {(() => {
                const weekday = selectedDay.getDay();
                const hours = businessHours?.find((h) => h.weekday === weekday);
                if (!hours || hours.closed) {
                  return (
                    <div className="mt-6 flex flex-col items-center justify-center gap-2 text-zinc-600">
                      <X className="h-8 w-8 text-zinc-700" />
                      <p className="text-sm">Dia fechado para atendimento</p>
                    </div>
                  );
                }

                return (
                  <>
                    <p className="mb-5 text-xs text-zinc-500">
                      06:00 – 00:00 • Intervalos de 1 em 1 hora
                    </p>
                    <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                      {selectedDaySlots.map((slot) => {
                        const slotDate = new Date(slot.iso);
                        const slotEnd = new Date(slotDate.getTime() + 60 * 60 * 1000);

                        // Check appointment
                        const appt = appointments.find((a) => {
                          const aStart = parseISO(a.starts_at);
                          const aEnd = parseISO(a.ends_at);
                          return slotDate >= aStart && slotDate < aEnd;
                        });

                        // Check blocked
                        const block = blockedSlots.find((b) => {
                          const bStart = parseISO(b.starts_at);
                          const bEnd = parseISO(b.ends_at);
                          return slotDate >= bStart && slotDate < bEnd;
                        });

                        if (appt) {
                          return (
                            <div
                              key={slot.iso}
                              className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5"
                            >
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                <div>
                                  <p className="text-xs font-bold text-emerald-300">{slot.time}</p>
                                  <p className="text-[10px] text-emerald-500/80">{appt.client_name}</p>
                                </div>
                              </div>
                              <span className="text-[10px] text-zinc-500 truncate max-w-[80px]">
                                {(appt as any).services?.name}
                              </span>
                            </div>
                          );
                        }

                        // Morning (< 09:00) or Night (>= 19:00) slot: Blocked by default unless block?.reason === 'desbloqueado'
                        if (slot.isEarly || slot.isNight) {
                          const isUnblocked = block?.reason === "desbloqueado";
                          const label = slot.isEarly ? "Manhã" : "Noturno";

                          if (isUnblocked && block) {
                            return (
                              <div
                                key={slot.iso}
                                className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5"
                              >
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-emerald-400 shrink-0" />
                                  <div>
                                    <p className="text-xs font-bold text-emerald-300">{slot.time}</p>
                                    <p className="text-[10px] text-emerald-400/70">{label} (Liberado)</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => unblockMutation.mutate(block.id)}
                                  disabled={unblockMutation.isPending}
                                  className="flex items-center gap-1 rounded-lg border border-red-500/40 bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50"
                                >
                                  {unblockMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Lock className="h-3 w-3" />
                                  )}
                                  Bloquear
                                </button>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={slot.iso}
                              className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2.5"
                            >
                              <div className="flex items-center gap-2">
                                <Lock className="h-4 w-4 text-red-400 shrink-0" />
                                <div>
                                  <p className="text-xs font-bold text-red-300">{slot.time}</p>
                                  <p className="text-[10px] text-red-400/70">{label} (Bloqueado)</p>
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  blockMutation.mutate({
                                    startsAt: slotDate.toISOString(),
                                    endsAt: slotEnd.toISOString(),
                                    reason: "desbloqueado",
                                  })
                                }
                                disabled={blockMutation.isPending}
                                className="flex items-center gap-1 rounded-lg border border-[#39ff14]/30 bg-[#39ff14]/10 px-2 py-1 text-[10px] font-bold text-[#39ff14] transition-all hover:bg-[#39ff14]/20 disabled:opacity-50"
                              >
                                {blockMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Unlock className="h-3 w-3" />
                                )}
                                Desbloquear
                              </button>
                            </div>
                          );
                        }

                        // Daytime slot (< 19:00)
                        if (block && block.reason !== "desbloqueado") {
                          return (
                            <div
                              key={slot.iso}
                              className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2.5"
                            >
                              <div className="flex items-center gap-2">
                                <Lock className="h-4 w-4 text-red-400 shrink-0" />
                                <p className="text-xs font-bold text-red-300">{slot.time}</p>
                              </div>
                              <button
                                onClick={() => unblockMutation.mutate(block.id)}
                                disabled={unblockMutation.isPending}
                                className="flex items-center gap-1 rounded-lg border border-zinc-700 px-2 py-1 text-[10px] font-bold text-zinc-400 transition-all hover:border-[#39ff14]/40 hover:text-[#39ff14] disabled:opacity-50"
                              >
                                {unblockMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Unlock className="h-3 w-3" />
                                )}
                                Desbloquear
                              </button>
                            </div>
                          );
                        }

                        // Free daytime slot (< 19:00)
                        return (
                          <div
                            key={slot.iso}
                            className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900 px-3 py-2.5"
                          >
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-zinc-600 shrink-0" />
                              <p className="text-xs font-medium text-zinc-400">{slot.time}</p>
                            </div>
                            <button
                              onClick={() =>
                                blockMutation.mutate({
                                  startsAt: slotDate.toISOString(),
                                  endsAt: slotEnd.toISOString(),
                                  reason: "Bloqueado pelo barbeiro",
                                })
                              }
                              disabled={blockMutation.isPending}
                              className="flex items-center gap-1 rounded-lg border border-zinc-700 px-2 py-1 text-[10px] font-bold text-zinc-500 transition-all hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-400 disabled:opacity-50"
                            >
                              {blockMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Lock className="h-3 w-3" />
                              )}
                              Bloquear
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Clientes Tab
// ─────────────────────────────────────────────
function ClientesTab({
  barber,
  role,
  onOpenAddModal,
}: {
  barber: { id: string } | null;
  role: string | null;
  onOpenAddModal?: () => void;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [cancelModalAppt, setCancelModalAppt] = useState<Appointment | null>(null);
  const [editModalAppt, setEditModalAppt] = useState<Appointment | null>(null);

  // Fetch all appointments for clients tab
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["clientes-appointments", barber?.id, role],
    queryFn: async () => {
      let q = supabase
        .from("appointments")
        .select("id, service_id, client_name, client_phone, starts_at, ends_at, price_cents, status, notes, services(name), barbers(name)")
        .order("starts_at", { ascending: false });

      if (barber?.id) {
        q = q.eq("barber_id", barber.id);
      }

      const { data } = await q;
      return (data ?? []) as Appointment[];
    },
    enabled: role !== null && !!barber?.id,
  });

  // Cancellation mutation
  const cancelMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelado" })
        .eq("id", appointmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["barber-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["painel-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["site-data"] });
      toast.success("Agendamento cancelado com sucesso. O horário está disponível novamente!");
      setCancelModalAppt(null);
    },
    onError: (err) => {
      toast.error("Erro ao cancelar o agendamento.");
      console.error(err);
    },
  });

  // Filter appointments by search text and status
  const filtered = appointments.filter((a) => {
    const matchesSearch =
      search.trim() === "" ||
      a.client_name.toLowerCase().includes(search.toLowerCase()) ||
      a.client_phone.includes(search) ||
      (a.services?.name ?? "").toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "todos" || a.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header & Search / Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">Clientes & Agendamentos</h1>
          <p className="text-xs text-zinc-400 sm:text-sm">
            Gerencie os clientes, entre em contato via WhatsApp e cancele ou edite se necessário.
          </p>
        </div>

        {/* Right side controls: Total Badge + Green Adicionar Button */}
        <div className="flex items-center gap-3">
          {onOpenAddModal && (
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 text-xs shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Adicionar</span>
            </button>
          )}

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-right">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Total Registrado</p>
            <p className="text-lg font-extrabold text-[#39ff14]">{appointments.length} agendamentos</p>
          </div>
        </div>
      </div>

      {/* Search Bar and Status Tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, telefone ou serviço..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 transition-all focus:border-[#39ff14]/50 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap gap-1 rounded-xl border border-zinc-800 bg-zinc-900/50 p-1">
          {[
            { id: "todos", label: "Todos" },
            { id: "agendado", label: "Agendados" },
            { id: "concluido", label: "Concluídos" },
            { id: "cancelado", label: "Cancelados" },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                statusFilter === s.id
                  ? "bg-[#39ff14] text-black shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Appointment / Client Cards */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#39ff14]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 text-center">
          <User className="mx-auto h-10 w-10 text-zinc-600 mb-3" />
          <p className="text-sm font-semibold text-zinc-400">Nenhum agendamento encontrado.</p>
          <p className="text-xs text-zinc-600 mt-1">Tente ajustar os filtros ou os termos de busca.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((appt) => {
            const startsDate = parseISO(appt.starts_at);
            const formattedDate = format(startsDate, "dd 'de' MMMM", { locale: ptBR });
            const formattedTime = format(startsDate, "HH:mm");

            // Format phone number for WhatsApp
            const rawDigits = appt.client_phone.replace(/\D/g, "");
            const fullPhone = rawDigits.startsWith("55") ? rawDigits : `55${rawDigits}`;
            const waMessage = encodeURIComponent(
              `Olá ${appt.client_name}, referente ao seu agendamento no Studio Blackout para ${formattedDate} às ${formattedTime}:`
            );
            const waUrl = `https://wa.me/${fullPhone}?text=${waMessage}`;

            const isCanceled = appt.status === "cancelado";

            return (
              <div
                key={appt.id}
                className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-all ${
                  isCanceled
                    ? "border-red-500/20 bg-red-500/5 opacity-70"
                    : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
                }`}
              >
                <div>
                  {/* Card Header: Name + Status */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-base font-bold text-white leading-tight">{appt.client_name}</h3>
                      <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3 text-zinc-500 shrink-0" />
                        {appt.client_phone}
                      </p>
                    </div>
                    <StatusBadge status={appt.status} />
                  </div>

                  {/* Booking Details Box */}
                  <div className="space-y-2 rounded-xl bg-zinc-950/60 p-3 text-xs border border-zinc-800/80 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Serviço:</span>
                      <span className="font-semibold text-white">{appt.services?.name ?? "Serviço"}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Data e Hora:</span>
                      <span className="font-semibold text-[#39ff14]">
                        {formattedDate} às {formattedTime}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Valor:</span>
                      <span className="font-bold text-white">{formatBRL(appt.price_cents)}</span>
                    </div>

                    {role === "admin" && appt.barbers?.name && (
                      <div className="flex justify-between items-center pt-1 border-t border-zinc-800/60">
                        <span className="text-zinc-500">Barbeiro:</span>
                        <span className="font-medium text-zinc-300">{appt.barbers.name}</span>
                      </div>
                    )}

                    {appt.notes && (
                      <div className="pt-1 text-[11px] text-zinc-400 italic">
                        "{appt.notes}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/60">
                  {/* WhatsApp Action Button */}
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 py-2 text-xs font-bold text-emerald-400 transition-all hover:bg-emerald-500/20 active:scale-95"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </a>

                  {/* Editar Action Button */}
                  {!isCanceled && (
                    <button
                      onClick={() => setEditModalAppt(appt)}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 px-3 py-2 text-xs font-bold text-blue-400 transition-all hover:bg-blue-500/20 active:scale-95"
                      title="Editar serviço e valor"
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </button>
                  )}

                  {/* Cancel Action Button */}
                  {!isCanceled && (
                    <button
                      onClick={() => setCancelModalAppt(appt)}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs font-bold text-red-400 transition-all hover:bg-red-500/20 active:scale-95"
                      title="Cancelar agendamento"
                    >
                      <XCircle className="h-4 w-4" />
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Appointment Modal */}
      {editModalAppt && (
        <EditAppointmentModal
          appt={editModalAppt}
          onClose={() => setEditModalAppt(null)}
        />
      )}

      {/* Cancellation Confirmation Modal */}
      {cancelModalAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Cancelar Agendamento?</h3>
                <p className="text-xs text-zinc-400">Esta ação liberará o horário no site.</p>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs space-y-1.5">
              <p><strong className="text-zinc-400">Cliente:</strong> <span className="text-white font-bold">{cancelModalAppt.client_name}</span></p>
              <p><strong className="text-zinc-400">Serviço:</strong> <span className="text-white">{cancelModalAppt.services?.name}</span></p>
              <p><strong className="text-zinc-400">Horário:</strong> <span className="text-[#39ff14] font-bold">{format(parseISO(cancelModalAppt.starts_at), "dd/MM/yyyy 'às' HH:mm")}</span></p>
              <p><strong className="text-zinc-400">Valor a descontar:</strong> <span className="text-white font-bold">{formatBRL(cancelModalAppt.price_cents)}</span></p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setCancelModalAppt(null)}
                disabled={cancelMutation.isPending}
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 py-2.5 text-xs font-bold text-zinc-300 transition-colors hover:bg-zinc-700"
              >
                Voltar
              </button>
              <button
                onClick={() => cancelMutation.mutate(cancelModalAppt.id)}
                disabled={cancelMutation.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-600/30 transition-all hover:bg-red-500 active:scale-95 disabled:opacity-50"
              >
                {cancelMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    Confirmar Cancelamento
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Modal: Editar Atendimento (Serviço e Valor Gasto)
// ─────────────────────────────────────────────
function EditAppointmentModal({
  appt,
  onClose,
}: {
  appt: Appointment;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: services = [] } = useQuery({
    queryKey: ["active-services-edit"],
    queryFn: async () => {
      const { data } = await supabase
        .from("services")
        .select("id, name, price_cents")
        .eq("active", true)
        .order("sort_order");
      return data ?? [];
    },
  });

  const initialServiceId = appt.service_id ?? "";
  const [selectedServiceId, setSelectedServiceId] = useState<string>(initialServiceId);
  const [priceInput, setPriceInput] = useState<string>(
    (appt.price_cents / 100).toFixed(2).replace(".", ",")
  );
  const [notesInput, setNotesInput] = useState<string>(appt.notes ?? "");

  const handleServiceSelect = (svcId: string) => {
    setSelectedServiceId(svcId);
    if (svcId === "corte_mensal") {
      setPriceInput("0,00");
    } else if (svcId !== "personalizado") {
      const found = services.find((s) => s.id === svcId);
      if (found) {
        setPriceInput((found.price_cents / 100).toFixed(2).replace(".", ","));
      }
    }
  };

  const editMutation = useMutation({
    mutationFn: async () => {
      const cleanPrice = priceInput.replace(/[^\d,.]/g, "").replace(",", ".");
      const parsedVal = parseFloat(cleanPrice);
      if (Number.isNaN(parsedVal) || parsedVal < 0) {
        throw new Error("Informe um valor válido.");
      }
      const priceCents = Math.round(parsedVal * 100);

      const updatePayload: {
        price_cents: number;
        notes?: string | null;
        service_id?: string;
      } = {
        price_cents: priceCents,
        notes: notesInput.trim() || null,
      };

      if (selectedServiceId && selectedServiceId !== "personalizado" && selectedServiceId !== "corte_mensal") {
        updatePayload.service_id = selectedServiceId;
      }

      if (selectedServiceId === "corte_mensal" && !notesInput.includes("[Corte Mensal]")) {
        updatePayload.notes = notesInput.trim() ? `[Corte Mensal] ${notesInput.trim()}` : "Corte Mensal (Plano Mensal)";
      }

      const { error } = await supabase
        .from("appointments")
        .update(updatePayload)
        .eq("id", appt.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barber-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["painel-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["clientes-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["site-data"] });
      toast.success("Agendamento e valor atualizados!");
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao atualizar agendamento.");
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5 text-[#39ff14]">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#39ff14]/10 border border-[#39ff14]/20">
              <Pencil className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">Editar Agendamento</h3>
              <p className="text-xs text-zinc-400">{appt.client_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            editMutation.mutate();
          }}
          className="space-y-4 text-xs"
        >
          {/* Service Selection */}
          <div>
            <label className="block font-semibold text-zinc-300 mb-1.5">Serviço</label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
              {services.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleServiceSelect(s.id)}
                  className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                    selectedServiceId === s.id
                      ? "border-[#39ff14] bg-[#39ff14]/10 text-white font-bold"
                      : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <span>{s.name}</span>
                  <span className="text-zinc-500 font-normal">{formatBRL(s.price_cents)}</span>
                </button>
              ))}

              {/* Corte Mensal Option */}
              <button
                type="button"
                onClick={() => handleServiceSelect("corte_mensal")}
                className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                  selectedServiceId === "corte_mensal"
                    ? "border-[#39ff14] bg-[#39ff14]/10 text-white font-bold"
                    : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#39ff14]" />
                  Corte Mensal
                </span>
                <span className="text-xs text-[#39ff14] font-semibold">R$ 0,00 (Plano Mensal)</span>
              </button>

              {/* Personalizado Option */}
              <button
                type="button"
                onClick={() => handleServiceSelect("personalizado")}
                className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                  selectedServiceId === "personalizado"
                    ? "border-[#39ff14] bg-[#39ff14]/10 text-white font-bold"
                    : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Scissors className="h-3.5 w-3.5 text-[#39ff14]" />
                  Personalizado
                </span>
                <span className="text-xs text-[#39ff14] font-semibold">Valor Sob Medida</span>
              </button>
            </div>
          </div>

          {/* Price Cents / Valor Gasto */}
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Valor Gasto (R$)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-zinc-400 font-bold">R$</span>
              <input
                type="text"
                required
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder="0,00"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 py-2.5 pl-10 pr-3 text-sm font-bold text-white focus:border-[#39ff14] focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Altere o valor gasto pelo cliente neste agendamento (permite R$ 0,00 para plano mensal).
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Observações (opcional)</label>
            <textarea
              rows={2}
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="Ex: Valor sob medida / ajuste"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-2.5 text-zinc-300 focus:border-[#39ff14] focus:outline-none resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={editMutation.isPending}
              className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 py-2.5 font-bold text-zinc-300 hover:bg-zinc-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={editMutation.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#39ff14] py-2.5 font-bold text-black shadow-lg shadow-[#39ff14]/20 hover:bg-[#32e010] active:scale-95 disabled:opacity-50"
            >
              {editMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Modal: Adicionar Atendimento Manual (Concluído)
// ─────────────────────────────────────────────
function AddAppointmentModal({
  barber,
  role,
  onClose,
}: {
  barber: { id: string; name?: string } | null;
  role: string | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [selectedBarberId, setSelectedBarberId] = useState(barber?.id ?? "");
  const [serviceId, setServiceId] = useState("");
  const [customPriceInput, setCustomPriceInput] = useState("0,00");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState(format(new Date(), "HH:mm"));
  const [notes, setNotes] = useState("");

  // Fetch active services
  const { data: services = [] } = useQuery({
    queryKey: ["active-services"],
    queryFn: async () => {
      const { data } = await supabase
        .from("services")
        .select("id, name, price_cents, duration_min")
        .eq("active", true)
        .order("sort_order");
      return data ?? [];
    },
  });

  // Fetch active barbers if admin
  const { data: barbers = [] } = useQuery({
    queryKey: ["active-barbers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("barbers")
        .select("id, name")
        .eq("active", true)
        .order("sort_order");
      return data ?? [];
    },
    enabled: role === "admin",
  });

  useEffect(() => {
    if (!selectedBarberId && barber?.id) {
      setSelectedBarberId(barber.id);
    } else if (!selectedBarberId && barbers.length > 0) {
      setSelectedBarberId(barbers[0].id);
    }
  }, [barber, barbers, selectedBarberId]);

  useEffect(() => {
    if (!serviceId && services.length > 0) {
      setServiceId(services[0].id);
      setCustomPriceInput((services[0].price_cents / 100).toFixed(2).replace(".", ","));
    }
  }, [services, serviceId]);

  const handleServiceChange = (newServiceId: string) => {
    setServiceId(newServiceId);
    if (newServiceId === "corte_mensal") {
      setCustomPriceInput("0,00");
    } else {
      const found = services.find((s) => s.id === newServiceId);
      if (found) {
        setCustomPriceInput((found.price_cents / 100).toFixed(2).replace(".", ","));
      }
    }
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!clientName.trim()) throw new Error("Informe o nome do cliente.");
      if (!serviceId) throw new Error("Selecione um serviço.");
      const bId = selectedBarberId || barber?.id;
      if (!bId) throw new Error("Barbeiro não identificado.");

      let targetServiceId = serviceId;
      let duration = 30;

      if (serviceId === "corte_mensal") {
        const foundCorte = services.find((s) => s.name.toLowerCase().includes("corte")) || services[0];
        targetServiceId = foundCorte?.id ?? "";
        duration = foundCorte?.duration_min ?? 30;
      } else {
        const selectedService = services.find((s) => s.id === serviceId);
        duration = selectedService?.duration_min ?? 30;
      }

      if (!targetServiceId) throw new Error("Serviço não identificado.");

      const cleanPrice = (customPriceInput || "0").replace(/[^\d,.]/g, "").replace(",", ".");
      const parsedVal = parseFloat(cleanPrice);
      const priceCents = Number.isNaN(parsedVal) || parsedVal < 0 ? 0 : Math.round(parsedVal * 100);

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Informe uma data válida.");
      const hhmm = (time || "12:00").slice(0, 5);
      const startDate = new Date(`${date}T${hhmm}:00-03:00`);
      if (Number.isNaN(startDate.getTime())) throw new Error("Informe um horário válido.");
      const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

      const { data: conflicts } = await supabase
        .from("appointments")
        .select("id, starts_at, ends_at")
        .eq("barber_id", bId)
        .neq("status", "cancelado")
        .lt("starts_at", endDate.toISOString())
        .gt("ends_at", startDate.toISOString())
        .limit(1);
      if (conflicts && conflicts.length > 0) {
        const c = conflicts[0];
        throw new Error(
          `Já existe um atendimento das ${format(parseISO(c.starts_at), "HH:mm")} às ${format(parseISO(c.ends_at), "HH:mm")} nesse horário. Escolha outro horário.`
        );
      }

      let finalNotes = notes.trim();
      if (serviceId === "corte_mensal") {
        finalNotes = finalNotes ? `[Corte Mensal] ${finalNotes}` : "Corte Mensal (Plano Mensal)";
      } else if (!finalNotes) {
        finalNotes = "Atendimento balcão (Adicionado no painel)";
      }

      const { error } = await supabase.from("appointments").insert({
        barber_id: bId,
        service_id: targetServiceId,
        client_name: clientName.trim(),
        client_phone: clientPhone.trim() || "(19) 00000-0000",
        starts_at: startDate.toISOString(),
        ends_at: endDate.toISOString(),
        price_cents: priceCents,
        status: "concluido",
        notes: finalNotes,
      });

      if (error) {
        if (error.code === "23P01") throw new Error("Esse horário já está ocupado. Escolha outro horário.");
        throw new Error("Não foi possível salvar o atendimento. Tente novamente.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barber-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["painel-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["clientes-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["site-data"] });
      toast.success("Atendimento concluído adicionado e receita atualizada!");
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao adicionar atendimento.");
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2 text-emerald-400">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">Adicionar Atendimento Realizado</h3>
              <p className="text-xs text-zinc-400">Preencha os dados do atendimento concluído</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addMutation.mutate();
          }}
          className="space-y-4 text-xs"
        >
          {/* Cliente Name */}
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Nome do Cliente *</label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ex: João Silva"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-white placeholder-zinc-500 focus:border-emerald-500/50 focus:outline-none"
            />
          </div>

          {/* Telefone */}
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Telefone (Opcional)</label>
            <input
              type="text"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="Ex: (19) 99999-9999"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-white placeholder-zinc-500 focus:border-emerald-500/50 focus:outline-none"
            />
          </div>

          {/* Service & Barber Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Serviço Realizado *</label>
              <select
                value={serviceId}
                onChange={(e) => handleServiceChange(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-white focus:border-emerald-500/50 focus:outline-none"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (R$ {(s.price_cents / 100).toFixed(2).replace(".", ",")})
                  </option>
                ))}
                <option value="corte_mensal">Corte Mensal (Plano Mensal - R$ 0,00 ou Personalizado)</option>
              </select>
            </div>

            {role === "admin" && barbers.length > 0 ? (
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Barbeiro *</label>
                <select
                  value={selectedBarberId}
                  onChange={(e) => setSelectedBarberId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-white focus:border-emerald-500/50 focus:outline-none"
                >
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          {/* Valor Gasto (R$) */}
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Valor Gasto (R$) *</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-zinc-400 font-bold">R$</span>
              <input
                type="text"
                required
                value={customPriceInput}
                onChange={(e) => setCustomPriceInput(e.target.value)}
                placeholder="0,00"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2 pl-10 pr-3 text-white font-bold focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              Para atendimentos de plano mensal, informe R$ 0,00 ou o valor cobrado.
            </p>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Data *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-white focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Horário (Opcional)</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-white focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Observação (Opcional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Pagou em dinheiro no balcão"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-white placeholder-zinc-500 focus:border-emerald-500/50 focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 py-2.5 text-xs font-bold text-zinc-300 hover:bg-zinc-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={addMutation.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition-all active:scale-95 disabled:opacity-50"
            >
              {addMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Finalizar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

