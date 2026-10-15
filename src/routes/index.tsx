import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Clock, ExternalLink, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBooking } from "@/components/booking/booking-provider";
import { siteQueryOptions } from "@/lib/queries";
import { formatBRL, formatDuration } from "@/lib/format";
import sobreImg from "@/assets/sobre-barbearia.jpg";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Studio Blackout — Barbearia premium com agendamento online" },
      {
        name: "description",
        content:
          "Agende seu corte na Studio Blackout em segundos. Barbeiros especialistas, ambiente reservado e horários confirmados na hora pelo WhatsApp.",
      },
      { property: "og:title", content: "Studio Blackout — Barbearia premium com agendamento online" },
      {
        property: "og:description",
        content: "Agende seu corte na Studio Blackout em segundos. Barbeiros especialistas, ambiente reservado e horários confirmados na hora pelo WhatsApp.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { openBooking } = useBooking();
  const { data: site } = useQuery(siteQueryOptions);

  const whatsappDigits = (site?.settings?.whatsapp ?? "").replace(/\D/g, "");
  const whatsappUrl = whatsappDigits ? `https://wa.me/${whatsappDigits}` : "https://wa.me/";

  return (
    <div>
      {/* SEÇÃO HERO */}
      <section className="relative min-h-[85vh] md:min-h-screen flex items-center justify-center isolate">
        {/* Imagem de Fundo Fixa (Efeito de revelação/site subindo no Mobile e Desktop) */}
        <div className="fixed inset-0 -z-10 h-screen w-full pointer-events-none overflow-hidden">
          <img
            src="/hero-bg.jpg"
            alt="Studio Blackout Barbearia"
            className="w-full h-full object-cover object-center"
            loading="eager"
            // @ts-ignore
            fetchPriority="high"
            decoding="async"
          />
          {/* Overlay equilibrado para preservar nitidez e visibilidade */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/25 to-black/80" />
        </div>

        <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center px-4 py-32 md:py-44 z-10">
          <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-[1.1] tracking-tight md:text-6xl text-white drop-shadow-lg">
            Seu corte, Sua experiência<br />Sem burocracia!
          </h1>
          <div className="mt-8 flex justify-center">
            <Button size="lg" onClick={openBooking} className="px-8 py-6 text-base font-semibold shadow-2xl">
              Agendar agora
            </Button>
          </div>
        </div>
      </section>

      {/* Conteúdo Restante do Site que sobe por cima da Hero */}
      <div className="relative z-10 shadow-2xl">
        {/* SEÇÃO SOBRE NÓS (Fundo Branco) */}
        <section id="sobre" className="w-full bg-white text-zinc-900 py-20 px-4 overflow-hidden">
        <div className="mx-auto max-w-4xl">
          {/* Título e Subtítulo Centralizados */}
          <div className="text-center mb-8">
            <span className="block text-sm font-semibold uppercase tracking-widest text-zinc-500 mb-1">
              Conheça sobre o
            </span>
            <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-zinc-900">
              Studio Blackout
            </h2>
          </div>

          {/* Texto de Apresentação */}
          <div className="space-y-6 text-zinc-700 leading-relaxed text-base sm:text-lg text-left sm:text-justify">
            <p>
              A barbearia Blackout, em Campinas é o lugar perfeito para os homens que buscam uma experiência única e elegante. Nós valorizamos cada detalhe, desde a escolha dos melhores produtos do mercado até a habilidade e sabedoria dos nossos profissionais. Nós acreditamos que um homem deve se sentir valorizado e homenageado, afinal, sua aparência é importante. É por isso que oferecemos serviços de corte de cabelo e barba.
            </p>
            <p>
              Aqui, você encontrará um ambiente acolhedor e confortável, onde poderá relaxar e desfrutar de uma cerveja gelada enquanto espera pelo seu horário. Nossos profissionais são altamente treinados e experientes, e estão sempre prontos para ajudá-lo a encontrar o estilo perfeito para você. Acima de tudo, queremos que você se sinta bem e satisfeito com o resultado.
            </p>
          </div>
        </div>
      </section>

      {/* SEÇÃO SERVIÇOS (Modelo Imagem 2 - Fundo Preto) */}
      <section id="servicos" className="w-full bg-black text-white py-24 px-4 border-t border-zinc-900">
        <div className="mx-auto max-w-6xl">
          {/* Cabeçalho */}
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-3">
              Tradição e qualidade
            </h2>
            <div className="flex items-center justify-center gap-3 text-xs uppercase tracking-[0.25em] font-semibold text-[#39ff14]">
              <span className="h-px w-8 bg-[#39ff14]/80" />
              <span>O QUE NÓS FAZEMOS</span>
              <span className="h-px w-8 bg-[#39ff14]/80" />
            </div>
          </div>

          {/* Grid de Serviços estilo Imagem 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {(site?.services ?? []).map((s) => {
              const { desc, iconType } = getServiceDetails(s.name, s.description);
              return (
                <div
                  key={s.id}
                  className="group relative flex flex-col items-center text-center p-8 rounded-2xl bg-zinc-950/90 border border-zinc-800/80 hover:border-[#39ff14]/40 hover:bg-zinc-900/80 transition-all duration-300 shadow-xl"
                >
                  {/* Ícone */}
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-white group-hover:scale-110 group-hover:bg-[#39ff14] group-hover:text-black transition-all duration-300">
                    <ServiceIcon type={iconType} />
                  </div>

                  {/* Nome do Serviço */}
                  <h3 className="font-display text-xl font-bold text-white mb-3 group-hover:text-[#39ff14] transition-colors">
                    {s.name}
                  </h3>

                  {/* Descrição detalhada */}
                  <p className="text-sm text-zinc-400 leading-relaxed mb-6 flex-1">
                    {desc}
                  </p>

                  {/* Preço e Duração */}
                  <div className="w-full pt-4 border-t border-zinc-800/80 flex items-center justify-between text-sm">
                    <span className="text-xs font-medium text-zinc-500">
                      {formatDuration(s.duration_min)}
                    </span>
                    <span className="font-display font-extrabold text-[#39ff14] text-base">
                      {formatBRL(s.price_cents)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SEÇÃO LOCALIZAÇÃO E HORÁRIOS (Fundo Branco) */}
      <section id="localizacao" className="w-full bg-white text-zinc-900 py-24 px-4 border-t border-zinc-200">
        <div className="mx-auto max-w-6xl">
          {/* Cabeçalho da Seção */}
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900 mb-3">
              Nossa Localização
            </h2>
            <div className="flex items-center justify-center gap-3 text-xs uppercase tracking-[0.25em] font-semibold text-zinc-500">
              <span className="h-px w-8 bg-zinc-300" />
              <span>VENHA NOS VISITAR</span>
              <span className="h-px w-8 bg-zinc-300" />
            </div>
          </div>

          {/* Grid: Card do Mapa e Card dos Horários */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* CARD 1: MAPA CLICÁVEL */}
            <a
              href={
                site?.settings?.maps_url ||
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${site?.settings?.address || "Rua conselho das sociedades, 475 - Jd yeda"}, Campinas - SP`
                )}`
              }
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir endereço no Google Maps"
              className="group relative flex flex-col justify-between min-h-[380px] sm:min-h-[440px] rounded-2xl border border-zinc-300 bg-zinc-100 overflow-hidden shadow-xl transition-all duration-300 hover:border-zinc-900 hover:shadow-2xl cursor-pointer"
            >
              {/* Mapa de Fundo Interativo (Google Maps Embed Claro) */}
              <div className="absolute inset-0 z-0 overflow-hidden">
                <iframe
                  title="Localização Studio Blackout no Mapa"
                  width="100%"
                  height="100%"
                  className="w-full h-full border-0 opacity-90 transition-all duration-500 group-hover:opacity-100 group-hover:scale-105 pointer-events-none"
                  loading="lazy"
                  allowFullScreen
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(
                    site?.settings?.address || "Rua conselho das sociedades, 475 - Jd yeda"
                  )}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                />
              </div>

              {/* Overlay suave para legibilidade e destaque do clique */}
              <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/85 via-black/25 to-black/40 transition-opacity group-hover:from-black/90 group-hover:via-black/15" />

              {/* Tag Topo: Nome da Barbearia */}
              <div className="relative z-20 p-5 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 rounded-full bg-zinc-900/90 backdrop-blur-md px-4 py-1.5 border border-zinc-700 text-xs font-semibold text-white shadow-lg">
                  <MapPin className="h-4 w-4 text-[#39ff14]" />
                  <span>Studio Blackout</span>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full bg-zinc-900/90 backdrop-blur-md px-3 py-1 border border-zinc-700 text-[11px] font-bold text-[#39ff14]">
                  <span>Abrir GPS</span>
                  <ExternalLink className="h-3 w-3" />
                </div>
              </div>

              {/* Conteúdo Inferior: Endereço e Botão de Ação */}
              <div className="relative z-20 p-6 sm:p-8 space-y-4">
                <div>
                  <span className="text-xs uppercase tracking-widest text-[#39ff14] font-bold block mb-1">
                    Endereço Principal
                  </span>
                  <p className="text-lg sm:text-xl font-bold text-white group-hover:text-[#39ff14] transition-colors leading-snug">
                    {site?.settings?.address || "Rua conselho das sociedades, 475 - Jd yeda"}
                  </p>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-xl bg-[#39ff14] px-5 py-2.5 text-xs font-bold text-black shadow-lg transition-transform group-hover:scale-105">
                    <span>Clique para abrir no Google Maps</span>
                    <Navigation className="h-4 w-4 fill-current" />
                  </div>
                </div>
              </div>
            </a>

            {/* CARD 2: HORÁRIOS DE FUNCIONAMENTO (Estilo Fundo Claro) */}
            <div className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-zinc-50 p-6 sm:p-8 shadow-xl relative overflow-hidden text-zinc-900">
              <div className="space-y-6">
                {/* Cabeçalho do Card */}
                <div className="flex items-center gap-3 border-b border-zinc-200 pb-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-[#39ff14] shadow-md">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-zinc-900">Horários de Funcionamento</h3>
                    <p className="text-xs text-zinc-500">Atendimento com pontualidade e agendamento</p>
                  </div>
                </div>

                {/* Lista de Horários */}
                <ul className="space-y-2.5 text-sm">
                  {(site?.hours ?? []).map((h) => {
                    const todayWeekday = new Date().getDay();
                    const isToday = h.weekday === todayWeekday;
                    return (
                      <li
                        key={h.weekday}
                        className={`flex items-center justify-between p-2.5 rounded-lg transition-colors ${isToday
                            ? "bg-emerald-50 border border-emerald-300 font-medium"
                            : "hover:bg-zinc-200/50"
                          }`}
                      >
                        <span className="flex items-center gap-2 text-zinc-700 font-medium">
                          {WEEKDAYS[h.weekday]}
                          {isToday && (
                            <span className="rounded bg-[#39ff14] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-black">
                              Hoje
                            </span>
                          )}
                        </span>
                        <span
                          className={`font-semibold ${h.closed ? "text-zinc-400" : isToday ? "text-emerald-700" : "text-zinc-900"
                            }`}
                        >
                          {h.closed ? "Fechado" : `${h.open_time.slice(0, 5)} – ${h.close_time.slice(0, 5)}`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Botão de Agendamento Rápido no Card */}
              <div className="mt-8 pt-5 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-zinc-500 text-center sm:text-left">
                  Prefere garantir seu horário sem filas?
                </p>
                <Button size="sm" onClick={openBooking} className="w-full sm:w-auto font-semibold bg-zinc-900 text-white hover:bg-zinc-800">
                  Agendar agora
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}

function getServiceDetails(name: string, customDesc?: string | null) {
  const lower = name.toLowerCase();

  let desc = customDesc || "";
  let iconType = "hair";

  if (lower.includes("corte") && lower.includes("barba") && lower.includes("sobrancelha")) {
    iconType = "combo";
    if (!desc || desc.includes("ritual")) desc = "Combo completo de corte, barba e sobrancelha.";
  } else if (lower.includes("barba") && !lower.includes("corte")) {
    iconType = "beard";
    if (!desc || desc.includes("Barba terapia") || desc.includes("toalha quente")) desc = "barba com acabamento em navalha";
  } else if (lower.includes("sobrancelha") && !lower.includes("corte")) {
    iconType = "eyebrow";
    if (!desc) desc = "Design e limpeza de sobrancelha.";
  } else if (lower.includes("corte") && lower.includes("barba")) {
    iconType = "combo";
    if (!desc || desc.includes("ritual")) desc = "Combo completo de corte e barba.";
  } else if (lower.includes("corte") && lower.includes("sobrancelha")) {
    iconType = "combo-eyebrow";
    if (!desc) desc = "Corte completo com design de sobrancelha.";
  } else if (lower.includes("corte")) {
    iconType = "hair";
    if (!desc) desc = "Corte de cabelo completo com acabamento.";
  } else if (lower.includes("tintura") || lower.includes("pigment")) {
    iconType = "dye";
    if (!desc) desc = "Coloração e pigmentação de alta qualidade para revitalizar a cor e o estilo dos seus fios.";
  } else if (lower.includes("progressiva") || lower.includes("escova")) {
    iconType = "comb";
    if (!desc) desc = "Alinhamento capilar profissional para fios alinhados, macios e fáceis de pentear no dia a dia.";
  } else if (lower.includes("relax") || lower.includes("hidrat")) {
    iconType = "wash";
    if (!desc) desc = "Tratamento de relaxamento e hidratação profunda para recuperar o brilho e a saúde do cabelo.";
  } else {
    if (!desc) desc = "Serviço exclusivo realizado por profissionais altamente treinados com os melhores produtos do mercado.";
  }

  return { desc, iconType };
}

function ServiceIcon({ type }: { type: string }) {
  // Barba: bigode + barba (estilo imagem 2)
  if (type === "beard") {
    return (
      <svg className="w-9 h-9 fill-current" viewBox="0 0 100 60">
        {/* bigode esquerdo */}
        <path d="M5 10 Q25 2 50 18 Q30 22 10 16 Z" />
        {/* bigode direito */}
        <path d="M95 10 Q75 2 50 18 Q70 22 90 16 Z" />
        {/* barba central */}
        <path d="M20 24 Q50 18 80 24 Q82 44 65 56 Q50 62 35 56 Q18 44 20 24 Z" />
      </svg>
    );
  }
  if (type === "eyebrow") {
    return (
      <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
        <path d="M3 13c3.5-3.5 8-5 13-3 2.5 1 4 2.5 5 4-1-.5-2.5-1.5-4.5-2-4-1-7.5 0-10.5 2.5C4.5 15.5 3.5 14.5 3 13z" />
      </svg>
    );
  }
  if (type === "combo" || type === "combo-eyebrow") {
    return (
      <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
        {/* tesoura + pente */}
        <path d="M6 2C4.3 2 3 3.3 3 5s1.3 3 3 3 3-1.3 3-3-1.3-3-3-3zm12 0c-1.7 0-3 1.3-3 3s1.3 3 3 3 3-1.3 3-3-1.3-3-3-3zM6 6c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm12 0c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zM6.7 7.3L12 12.6l5.3-5.3 1.4 1.4-5.3 5.3 5.3 5.3-1.4 1.4L12 15.4l-5.3 5.3-1.4-1.4 5.3-5.3-5.3-5.3z" />
      </svg>
    );
  }
  if (type === "dye") {
    return (
      <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
        <path d="M12 3c-4.4 0-8 3.6-8 8 0 5 8 10 8 10s8-5 8-10c0-4.4-3.6-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />
      </svg>
    );
  }
  if (type === "comb") {
    return (
      <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
        <path d="M4 4h2v16H4V4zm4 0h2v8H8V4zm4 0h2v16h-2V4zm4 0h2v8h-2V4zm4 0h2v16h-2V4z" />
      </svg>
    );
  }
  // Corte de cabelo: silhueta pompadour fiel à imagem de referência
  return (
    <svg className="w-9 h-9 fill-current" viewBox="0 0 64 56">
      <path d="
        M8 42
        C6 36 5 28 7 22
        C8 16 10 10 16 7
        C13 12 12 18 14 22
        C16 14 20 9 27 6
        C22 12 21 18 23 23
        C26 13 32 8 40 7
        C36 13 35 19 37 24
        C40 16 46 12 52 13
        C48 18 47 24 49 28
        C52 22 56 21 58 24
        C57 28 55 33 53 37
        C56 36 58 38 57 41
        C54 44 50 44 47 43
        C44 46 40 48 34 48
        C26 49 18 47 14 44
        C12 46 9 46 8 42
        Z
      "/>
      {/* Sombra lateral esquerda destacada */}
      <path d="M8 42 C5 44 4 50 6 54 C9 52 11 48 14 44 C11 44 9 43 8 42 Z" />
    </svg>
  );
}
