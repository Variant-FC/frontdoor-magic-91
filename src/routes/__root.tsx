import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import {
  Bell,
  CheckCircle2,
  FileText,
  Home,
  Receipt,
  Search,
  Sparkles,
  User,
  Wallet,
} from "lucide-react";


import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { MalumeProvider } from "../lib/malume/store";
import logoAsset from "../assets/malume-logo.png.asset.json";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Malume Money" },
      {
        name: "description",
        content:
          "Turn messy South African receipts and invoices into a clean ledger, with VAT calculated in code and explained in plain language.",
      },
      { name: "author", content: "Malume Money" },
      { property: "og:title", content: "Malume Money" },
      {
        property: "og:description",
        content:
          "Turn messy South African receipts and invoices into a clean ledger, with VAT calculated in code and explained in plain language.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Malume Money" },
      { name: "twitter:description", content: "Turn messy South African receipts and invoices into a clean ledger, with VAT calculated in code and explained in plain language." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b2ce50f0-0def-47d9-973b-af13f07f6f7c/id-preview-8ad73400--37d12a89-c77c-45de-8387-448425d3d14c.lovable.app-1785587492332.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b2ce50f0-0def-47d9-973b-af13f07f6f7c/id-preview-8ad73400--37d12a89-c77c-45de-8387-448425d3d14c.lovable.app-1785587492332.png" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },

      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],

  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
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

const NAV: {
  to: "/" | "/expenses" | "/ledger" | "/insights" | "/invoices" | "/review";
  label: string;
  icon: typeof Home;
  exact?: boolean;
}[] = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/ledger", label: "Ledger", icon: Wallet },
  { to: "/insights", label: "Insights", icon: Sparkles },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/review", label: "Review", icon: CheckCircle2 },
];

function SidebarNav() {
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          {...(item.exact ? { activeOptions: { exact: true } } : {})}
          className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
          activeProps={{
            className: "bg-sidebar-accent text-sidebar-accent-foreground",
          }}
        >
          <item.icon className="h-[18px] w-[18px]" aria-hidden />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function Sidebar() {
  return (
    <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-[280px] shrink-0 lg:block">
      <div className="float-panel flex h-full flex-col gap-6 p-5">
        <Link to="/" className="flex items-center justify-center">
          <img
            src={logoAsset.url}
            alt="Money Malume — AI financial assistant"
            className="h-24 w-auto"
          />
          <span className="sr-only">Malume Money</span>
        </Link>
        <SidebarNav />
        <div className="rounded-2xl bg-secondary p-4">
          <p className="text-xs font-semibold text-foreground">Prototype mode</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Synthetic data only. No bank, no SARS filing.
          </p>
        </div>
      </div>
    </aside>
  );
}

function MobileNav() {
  return (
    <div className="border-b border-border bg-background/85 px-4 py-3 backdrop-blur lg:hidden">
      <div className="flex items-center justify-between">
        <Link to="/">
          <img
            src={logoAsset.url}
            alt="Money Malume — AI financial assistant"
            className="h-14 w-auto"
          />
        </Link>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Search className="h-5 w-5" aria-hidden />
          <Bell className="h-5 w-5" aria-hidden />
        </div>
      </div>
      <nav className="mt-3 flex gap-1 overflow-x-auto pb-1">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            {...(item.exact ? { activeOptions: { exact: true } } : {})}
            className="shrink-0 rounded-2xl px-3 py-1.5 text-sm text-muted-foreground transition-colors"
            activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium" }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function TopBar() {
  return (
    <header className="hidden h-[72px] items-center gap-4 lg:flex">
      <div className="flex h-11 flex-1 items-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm text-muted-foreground">
        <Search className="h-4 w-4" aria-hidden />
        <span>Search expenses, invoices or suppliers</span>
      </div>
      <button
        type="button"
        aria-label="Notifications"
        className="grid h-11 w-11 place-items-center rounded-2xl border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden />
      </button>
      <div className="grid h-11 w-11 place-items-center rounded-2xl border border-border bg-card text-muted-foreground">
        <User className="h-[18px] w-[18px]" aria-hidden />
      </div>
    </header>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <MalumeProvider>
        <div className="min-h-screen bg-background">
          <MobileNav />
          <div className="mx-auto flex w-full max-w-[1440px] gap-8 px-4 md:px-6 lg:px-10">
            <Sidebar />
            <div className="flex min-h-screen w-full min-w-0 flex-col">
              <TopBar />
              {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
              <main className="flex-1 pb-10">
                <Outlet />
              </main>
              <footer className="border-t border-border py-6">
                <p className="text-xs text-muted-foreground">
                  Malume Money is an educational prototype built on synthetic data. It does not
                  connect to a bank, does not file with SARS, and does not provide tax or accounting
                  advice.
                </p>
              </footer>
            </div>
          </div>
        </div>
      </MalumeProvider>
    </QueryClientProvider>
  );
}


