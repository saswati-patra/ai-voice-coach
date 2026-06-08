import { Navigate } from "react-router-dom";
import { AlertTriangle, Cloud, Info, LogIn, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VoiceCoachWorkspace } from "@/hooks/use-voice-coach-workspace";
import { loginProviderCopy, loginRedirectPath } from "@/lib/auth-flow";

type LoginPageProps = {
  workspace: VoiceCoachWorkspace;
};

export function LoginPage({ workspace }: LoginPageProps) {
  const { auth } = workspace;
  const redirectTo = loginRedirectPath({
    requiresFirebaseAuth: auth.requiresFirebaseAuth,
    signedIn: Boolean(auth.authUser),
  });

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  const providerCopy = loginProviderCopy();

  return (
    <div className="mx-auto grid min-h-[calc(100vh-12rem)] w-full max-w-5xl items-center gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="space-y-5">
        <Badge variant="outline" className="border-primary/30 text-primary">
          Account
        </Badge>
        <div>
          <h1 className="text-foreground text-3xl font-semibold tracking-normal sm:text-4xl">
            Sign in to your study workspace
          </h1>
          <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-6">
            Access study materials, review items, voice practice, and cloud settings.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="bg-muted/70 rounded-lg p-4">
            <Cloud className="text-primary mb-3 size-5" />
            <p className="text-sm font-semibold">Cloud identity</p>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              One account for local and hosted practice.
            </p>
          </div>
          <div className="bg-muted/70 rounded-lg p-4">
            <ShieldCheck className="text-primary mb-3 size-5" />
            <p className="text-sm font-semibold">Session continuity</p>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              Pick up where your last study session left off.
            </p>
          </div>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{providerCopy.title}</CardTitle>
          <p className="text-muted-foreground text-sm">{providerCopy.description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!auth.firebaseConfigured ? (
            <Alert variant="warning">
              <AlertTriangle className="size-4" />
              <AlertTitle>Sign-in settings missing</AlertTitle>
              <AlertDescription>
                This local build does not have sign-in settings yet.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-3">
            <Button onClick={auth.signIn} disabled={!auth.canSignIn} className="w-full">
              <LogIn className="size-4" />
              {providerCopy.actionLabel}
            </Button>
          </div>

          {auth.message ? (
            <div className="bg-muted/70 text-muted-foreground flex items-start gap-2 rounded-md p-3 text-sm">
              <Info className="mt-0.5 size-4 shrink-0" />
              <p>{auth.message}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
