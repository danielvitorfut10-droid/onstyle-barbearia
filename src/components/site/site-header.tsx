import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBooking } from "@/components/booking/booking-provider";
import { cn } from "@/lib/utils";

const LINKS: { to: string; hash?: string; label: string }[] = [
  { to: "/", label: "Início" },
  { to: "/", hash: "sobre", label: "Sobre" },
  { to: "/", hash: "servicos", label: "Serviços" },
  { to: "/", hash: "localizacao", label: "Localização" },
];

export function SiteHeader() {
  const { openBooking } = useBooking();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled || open
          ? "bg-black/95 backdrop-blur-md border-b border-zinc-800/80 shadow-md py-2"
          : "bg-transparent border-b border-transparent py-2.5"
      )}
    >
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4">
        <Link to="/" className="flex items-center">
          <img
            src="/logo-black.png"
            alt="Studio Blackout"
            className="h-16 w-auto max-h-28 object-contain transition-all duration-300 sm:h-20 md:h-24 my-[-8px]"
          />
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                hash={l.hash}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "text-foreground font-medium" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <Button size="sm" onClick={openBooking} className="hidden sm:inline-flex">
            Agendar agora
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <div className={cn("border-t border-border/60 md:hidden bg-background/95 backdrop-blur-md", open ? "block" : "hidden")}>
        <nav className="mx-auto flex max-w-6xl flex-col p-3">
          {LINKS.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              hash={l.hash}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground"
              activeProps={{ className: "text-foreground font-medium" }}
            >
              {l.label}
            </Link>
          ))}
          <Button
            className="mt-2"
            onClick={() => {
              setOpen(false);
              openBooking();
            }}
          >
            Agendar agora
          </Button>
        </nav>
      </div>
    </header>
  );
}

