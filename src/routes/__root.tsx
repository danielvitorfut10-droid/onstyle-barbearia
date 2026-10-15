import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  Link,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { BookingProvider } from "@/components/booking/booking-provider";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { siteQueryOptions } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O endereço acessado não existe ou foi movido.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

import { ErrorComponentProps } from "@tanstack/react-router";

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error as Error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Não foi possível carregar esta página
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado do nosso lado. Tente atualizar ou volte ao início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ir para o início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: ({ context }) => context.queryClient.ensureQueryData(siteQueryOptions),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#0A0A0A" },
      { name: "author", content: "Studio Blackout" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Studio Blackout" },
      { property: "og:url", content: "https://studioblackout.com.br" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Studio Blackout — Barbearia premium com agendamento online" },
      { property: "og:title", content: "Studio Blackout — Barbearia premium com agendamento online" },
      { name: "twitter:title", content: "Studio Blackout — Barbearia premium com agendamento online" },
      { name: "description", content: "Agende seu corte na Studio Blackout em segundos. Barbeiros especialistas, ambiente reservado e horários confirmados na hora pelo WhatsApp." },
      { property: "og:description", content: "Agende seu corte na Studio Blackout em segundos. Barbeiros especialistas, ambiente reservado e horários confirmados na hora pelo WhatsApp." },
      { name: "twitter:description", content: "Agende seu corte na Studio Blackout em segundos. Barbeiros especialistas, ambiente reservado e horários confirmados na hora pelo WhatsApp." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b306752a-d060-4f83-ada0-d5525aeaa042/id-preview-3ea1a44b--7a263d8f-5371-42bc-ad05-07bc7a9ae74a.lovable.app-1785894619680.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b306752a-d060-4f83-ada0-d5525aeaa042/id-preview-3ea1a44b--7a263d8f-5371-42bc-ad05-07bc7a9ae74a.lovable.app-1785894619680.png" },
    ],
    links: [
      { rel: "canonical", href: "https://studioblackout.com.br" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&family=Roboto:wght@300;400;500;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isApp = pathname.startsWith("/painel") || pathname.startsWith("/auth");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <BookingProvider>
        {isApp ? (
          <Outlet />
        ) : (
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">
              {/* Required: nested routes render here. */}
              <Outlet />
            </main>
            <SiteFooter />
          </div>
        )}
      </BookingProvider>
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
