import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { VoiceCoachWorkspace } from "@/hooks/use-voice-coach-workspace";
import { protectedRouteRedirectPath } from "@/lib/auth-flow";

type AuthRequiredProps = {
  children: ReactNode;
  workspace: VoiceCoachWorkspace;
};

export function AuthRequired({ children, workspace }: AuthRequiredProps) {
  const { auth } = workspace;
  const redirectTo = protectedRouteRedirectPath({
    authReady: auth.authReady,
    requiresFirebaseAuth: auth.requiresFirebaseAuth,
    signedIn: Boolean(auth.authUser),
  });

  if (!redirectTo) {
    return children;
  }

  if (!auth.authReady) {
    return (
      <Card>
        <CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="bg-accent text-accent-foreground flex size-11 items-center justify-center rounded-lg">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-normal">Checking identity</h1>
            <p className="text-muted-foreground mt-2 text-sm">Preparing your local session.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <Navigate to={redirectTo} replace />;
}
