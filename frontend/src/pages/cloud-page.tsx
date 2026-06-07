import { CheckCircle2, Cloud, Info, KeyRound, LogIn, LogOut, Plug, Server, ShieldCheck, UserPlus } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BaseTabs,
  BaseTabsIndicator,
  BaseTabsList,
  BaseTabsPanel,
  BaseTabsTrigger,
} from "@/components/ui/base-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { VoiceCoachWorkspace } from "@/hooks/use-voice-coach-workspace";

type CloudPageProps = {
  workspace: VoiceCoachWorkspace;
};

export function CloudPage({ workspace }: CloudPageProps) {
  const { auth, loading } = workspace;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cloud"
        title="Auth and runtime wiring"
        description="Firebase identity, API targets, and deployment checkpoints."
      />

      {auth.requiresFirebaseAuth && !auth.canUseProtectedApi ? (
        <Alert variant="warning">
          <AlertDescription>{auth.authGateMessage}</AlertDescription>
        </Alert>
      ) : null}

      <BaseTabs defaultValue="identity" className="space-y-4">
        <BaseTabsList>
          <BaseTabsIndicator />
          <BaseTabsTrigger value="identity">
            <ShieldCheck className="mr-2 size-4" />
            Identity
          </BaseTabsTrigger>
          <BaseTabsTrigger value="targets">
            <Server className="mr-2 size-4" />
            Targets
          </BaseTabsTrigger>
          <BaseTabsTrigger value="workflow">
            <Cloud className="mr-2 size-4" />
            Workflow
          </BaseTabsTrigger>
        </BaseTabsList>

        <BaseTabsPanel value="identity">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Firebase Auth</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Dev auth locally. Firebase ID tokens in cloud mode.
                  </p>
                </div>
                <Badge variant={auth.authStatusTone}>{auth.authStateLabel}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {auth.showFirebaseControls && auth.authUser ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{auth.authUser.email || "Firebase user"}</p>
                    <p className="mt-1 break-all text-xs text-muted-foreground">{auth.authUser.uid}</p>
                  </div>
                  <Button variant="outline" onClick={auth.signOut}>
                    <LogOut className="size-4" />
                    Sign Out
                  </Button>
                </div>
              ) : auth.showFirebaseControls ? (
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
                  <Input
                    value={auth.email}
                    onChange={(event) => auth.setEmail(event.target.value)}
                    type="email"
                    placeholder="Email"
                    autoComplete="email"
                    disabled={!auth.authReady || loading}
                  />
                  <Input
                    value={auth.password}
                    onChange={(event) => auth.setPassword(event.target.value)}
                    type="password"
                    placeholder="Password"
                    autoComplete="current-password"
                    disabled={!auth.authReady || loading}
                  />
                  <Button onClick={auth.signIn} disabled={!auth.canSubmitCredentials}>
                    <LogIn className="size-4" />
                    Sign In
                  </Button>
                  <Button variant="outline" onClick={auth.createAccount} disabled={!auth.canSubmitCredentials}>
                    <UserPlus className="size-4" />
                    Create
                  </Button>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-4">
                  <KeyRound className="mt-0.5 size-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">Dev auth is active</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Protected routes use the local fixed user until Firebase mode is enabled.
                    </p>
                  </div>
                </div>
              )}
              {auth.message ? <p className="mt-4 text-sm text-muted-foreground">{auth.message}</p> : null}
            </CardContent>
          </Card>
        </BaseTabsPanel>

        <BaseTabsPanel value="targets">
          <section className="grid gap-4 md:grid-cols-3">
            <TargetCard icon={Server} label="REST API" value={auth.apiTarget} />
            <TargetCard icon={Plug} label="WebSocket" value={auth.wsTarget} />
            <TargetCard
              icon={auth.firebaseConfigured ? CheckCircle2 : Info}
              label="Firebase"
              value={auth.firebaseConfigured ? "configured" : "not configured"}
            />
          </section>
        </BaseTabsPanel>

        <BaseTabsPanel value="workflow">
          <Card>
            <CardHeader>
              <CardTitle>Manual Cloud Flow</CardTitle>
              <p className="text-sm text-muted-foreground">Deployment checkpoints for the learning environment.</p>
            </CardHeader>
            <CardContent>
              <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  "Apply OpenTofu when cloud resources change.",
                  "Run the manual GitHub Action to deploy when ready.",
                  "Sign in with Firebase from the hosted frontend.",
                  "Upload, ingest, review, then test voice.",
                ].map((item, index) => (
                  <li key={item} className="rounded-md bg-muted/60 p-4">
                    <span className="mb-3 flex size-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                      {index + 1}
                    </span>
                    <p className="text-sm leading-6 text-muted-foreground">{item}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </BaseTabsPanel>
      </BaseTabs>
    </div>
  );
}

type TargetCardProps = {
  icon: typeof Server;
  label: string;
  value: string;
};

function TargetCard({ icon: Icon, label, value }: TargetCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{label}</p>
          <p className="mt-2 break-all text-sm font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
