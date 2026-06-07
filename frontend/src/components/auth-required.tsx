import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { VoiceCoachWorkspace } from "@/hooks/use-voice-coach-workspace";

type AuthRequiredProps = {
  children: ReactNode;
  workspace: VoiceCoachWorkspace;
};

export function AuthRequired({ children, workspace }: AuthRequiredProps) {
  const { auth } = workspace;

  if (!auth.requiresFirebaseAuth || auth.authUser) {
    return children;
  }

  if (!auth.authReady) {
    return (
      <Card>
        <CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex size-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-normal">Checking identity</h1>
            <p className="mt-2 text-sm text-muted-foreground">Preparing your local Firebase session.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <Navigate to="/cloud" replace />;
}
