import { LogOut, Mic, Plug, Square, Terminal, Volume2 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VoiceCoachWorkspace } from "@/hooks/use-voice-coach-workspace";

type VoicePageProps = {
  workspace: VoiceCoachWorkspace;
};

export function VoicePage({ workspace }: VoicePageProps) {
  const { auth, protectedDisabled, voice } = workspace;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Voice Coach"
        title="Talk through the material"
        description="A focused session surface for spoken study practice."
        action={<Badge variant={voice.status === "recording" ? "success" : "secondary"}>{voice.status}</Badge>}
      />

      {!auth.canUseProtectedApi ? (
        <Alert variant="warning">
          <AlertDescription>{auth.authGateMessage}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="size-4 text-primary" />
              Session Controls
            </CardTitle>
            <p className="text-sm text-muted-foreground">Realtime voice session state.</p>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Button
              onClick={voice.connectVoice}
              disabled={protectedDisabled || voice.isConnected || voice.isConnecting}
            >
              <Plug className="size-4" />
              Connect
            </Button>
            <Button
              variant="outline"
              onClick={() => voice.startMic().catch((error) => voice.appendVoiceLog(error.message))}
              disabled={!voice.isConnected || voice.isRecording}
            >
              <Mic className="size-4" />
              Start Mic
            </Button>
            <Button variant="outline" onClick={voice.stopMic} disabled={!voice.isRecording}>
              <Square className="size-4" />
              Stop Mic
            </Button>
            <Button variant="outline" onClick={voice.disconnectVoice} disabled={!voice.isConnected}>
              <LogOut className="size-4" />
              Disconnect
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="size-4 text-primary" />
              Session Log
            </CardTitle>
            <p className="text-sm text-muted-foreground">Coach, transcript, turn, audio, and error events.</p>
          </CardHeader>
          <CardContent>
            <pre className="min-h-80 overflow-auto rounded-lg border border-border bg-slate-950 p-4 text-xs leading-6 text-slate-100">
              {voice.log.length ? voice.log.join("\n") : "Connect to start a voice session."}
            </pre>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
