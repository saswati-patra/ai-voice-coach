import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  BookOpen,
  Cloud,
  Gauge,
  Mic,
  RefreshCw,
  Sparkles,
  SquareStack,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { VoiceCoachWorkspace } from "@/hooks/use-voice-coach-workspace";
import { shouldShowWorkspaceNavigation } from "@/lib/auth-flow";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
  workspace: VoiceCoachWorkspace;
};

const navItems = [
  { to: "/", label: "Dashboard", icon: Gauge },
  { to: "/study", label: "Study", icon: SquareStack },
  { to: "/review", label: "Review", icon: BookOpen },
  { to: "/voice", label: "Voice", icon: Mic },
  { to: "/cloud", label: "Cloud", icon: Cloud },
];

export function AppShell({ children, workspace }: AppShellProps) {
  const { auth, loading, voice } = workspace;
  const showWorkspaceNavigation = shouldShowWorkspaceNavigation({
    requiresFirebaseAuth: auth.requiresFirebaseAuth,
    signedIn: Boolean(auth.authUser),
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <NavLink to="/" className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Sparkles className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-base font-semibold tracking-normal">
                  AI Voice Coach
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {auth.profile || "Local study workspace"}
                </span>
              </span>
            </NavLink>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="hidden border-primary/30 text-primary sm:inline-flex">
                {auth.authMode}
              </Badge>
              {showWorkspaceNavigation ? (
                <>
                  <Badge variant={voice.status === "recording" ? "success" : "secondary"} className="hidden sm:inline-flex">
                    {voice.status}
                  </Badge>
                  <Button
                    aria-label="Refresh workspace"
                    onClick={() => auth.refreshData()}
                    disabled={loading}
                    size="icon"
                    variant="outline"
                  >
                    <RefreshCw className={cn("size-4", loading && "animate-spin")} />
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          {showWorkspaceNavigation ? (
            <nav className="flex gap-1 overflow-x-auto pb-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                      isActive && "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
                    )
                  }
                >
                  <item.icon className="size-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          ) : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
