import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { BookOpen, Cloud, Gauge, Mic, RefreshCw, Sparkles, SquareStack } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { VoiceCoachWorkspace } from "@/hooks/use-voice-coach-workspace";
import { shouldShowWorkspaceNavigation, workspaceHeaderSubtitle } from "@/lib/auth-flow";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
  workspace: VoiceCoachWorkspace;
};

const navItems = [
  { to: "/app", label: "Dashboard", icon: Gauge },
  { to: "/app/study", label: "Study", icon: SquareStack },
  { to: "/app/review", label: "Review", icon: BookOpen },
  { to: "/app/voice", label: "Voice", icon: Mic },
  { to: "/app/cloud", label: "Cloud", icon: Cloud },
];

export function AppShell({ children, workspace }: AppShellProps) {
  const { auth, loading, voice } = workspace;
  const showWorkspaceNavigation = shouldShowWorkspaceNavigation({
    requiresFirebaseAuth: auth.requiresFirebaseAuth,
    signedIn: Boolean(auth.authUser),
  });
  const headerSubtitle = workspaceHeaderSubtitle({
    profile: auth.profile,
    requiresFirebaseAuth: auth.requiresFirebaseAuth,
    signedIn: Boolean(auth.authUser),
  });

  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="border-border bg-background/95 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <NavLink to="/app" className="flex min-w-0 items-center gap-3">
              <span className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-lg shadow-sm">
                <Sparkles className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-base font-semibold tracking-normal">
                  AI Voice Coach
                </span>
                <span className="text-muted-foreground block truncate text-xs">
                  {headerSubtitle}
                </span>
              </span>
            </NavLink>

            <div className="flex items-center gap-2">
              {showWorkspaceNavigation ? (
                <>
                  <Badge
                    variant={voice.status === "recording" ? "success" : "secondary"}
                    className="hidden sm:inline-flex"
                  >
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
                  end={item.to === "/app"}
                  className={({ isActive }) =>
                    cn(
                      "text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
                      isActive &&
                        "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-sm"
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
