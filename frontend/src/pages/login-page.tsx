import { Navigate } from "react-router-dom";
import { AlertTriangle, Cloud, Info, LogIn, ShieldCheck, UserPlus } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { VoiceCoachWorkspace } from "@/hooks/use-voice-coach-workspace";
import { loginRedirectPath } from "@/lib/auth-flow";

type LoginPageProps = {
  workspace: VoiceCoachWorkspace;
};

export function LoginPage({ workspace }: LoginPageProps) {
  const { auth, loading } = workspace;
  const redirectTo = loginRedirectPath({
    requiresFirebaseAuth: auth.requiresFirebaseAuth,
    signedIn: Boolean(auth.authUser),
  });

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-12rem)] w-full max-w-5xl items-center gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="space-y-5">
        <Badge variant="outline" className="border-primary/30 text-primary">
          Firebase Auth
        </Badge>
        <div>
          <h1 className="text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
            Sign in to your study workspace
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Access study materials, review items, voice practice, and cloud settings.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-muted/70 p-4">
            <Cloud className="mb-3 size-5 text-primary" />
            <p className="text-sm font-semibold">Cloud identity</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              One account for local and hosted practice.
            </p>
          </div>
          <div className="rounded-lg bg-muted/70 p-4">
            <ShieldCheck className="mb-3 size-5 text-primary" />
            <p className="text-sm font-semibold">Session continuity</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Pick up where your last study session left off.
            </p>
          </div>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <p className="text-sm text-muted-foreground">Create an account or sign in with email and password.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!auth.firebaseConfigured ? (
            <Alert variant="warning">
              <AlertTriangle className="size-4" />
              <AlertTitle>Firebase config missing</AlertTitle>
              <AlertDescription>
                This local build does not have Firebase settings yet.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-3">
            <Input
              value={auth.email}
              onChange={(event) => auth.setEmail(event.target.value)}
              type="email"
              placeholder="Email"
              autoComplete="email"
              disabled={!auth.authReady || loading || !auth.firebaseConfigured}
            />
            <Input
              value={auth.password}
              onChange={(event) => auth.setPassword(event.target.value)}
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              disabled={!auth.authReady || loading || !auth.firebaseConfigured}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={auth.signIn} disabled={!auth.canSubmitCredentials}>
              <LogIn className="size-4" />
              Sign In
            </Button>
            <Button variant="outline" onClick={auth.createAccount} disabled={!auth.canSubmitCredentials}>
              <UserPlus className="size-4" />
              Create Account
            </Button>
          </div>

          {auth.message ? (
            <div className="flex items-start gap-2 rounded-md bg-muted/70 p-3 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" />
              <p>{auth.message}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
