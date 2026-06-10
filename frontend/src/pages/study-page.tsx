import { BookOpen, FileText, Loader2, UploadCloud } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { VoiceCoachWorkspace } from "@/hooks/use-voice-coach-workspace";

type StudyPageProps = {
  workspace: VoiceCoachWorkspace;
};

export function StudyPage({ workspace }: StudyPageProps) {
  const { auth, loading, protectedDisabled, study } = workspace;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Study Materials"
        title="Build the source library"
        description="Source files, ingestion status, summaries, and key concepts."
      />

      {!auth.canUseProtectedApi ? (
        <Alert variant="warning">
          <AlertDescription>{auth.authGateMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="surface-card">
        <CardHeader>
          <CardTitle>Upload Material</CardTitle>
          <p className="text-muted-foreground text-sm">
            Attach a PDF or text source for the current workspace.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto]">
            <Input
              value={study.title}
              onChange={(event) => study.setTitle(event.target.value)}
              placeholder="Optional title"
              disabled={protectedDisabled}
            />
            <Input
              type="file"
              accept=".pdf,.txt,text/plain,application/pdf"
              onChange={(event) => study.setSelectedFile(event.target.files?.[0] || null)}
              disabled={protectedDisabled}
            />
            <Button
              onClick={study.uploadSelectedFile}
              disabled={protectedDisabled || !study.selectedFile}
              className="pressable lg:min-w-32"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UploadCloud className="size-4" />
              )}
              Upload
            </Button>
          </div>
          {auth.message ? (
            <p className="text-muted-foreground mt-3 text-sm">{auth.message}</p>
          ) : null}
        </CardContent>
      </Card>

      {study.materials.length ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {study.materials.map((material) => (
            <Card key={material.id} className="surface-card flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate">{material.title}</CardTitle>
                    <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                      {material.original_filename || material.source_type} /{" "}
                      {formatBytes(material.size_bytes)}
                    </p>
                  </div>
                  <IngestionBadge status={material.ingestion_status} />
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                {material.summary ? (
                  <p className="text-muted-foreground line-clamp-4 text-sm leading-6">
                    {material.summary}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm leading-6">
                    Summary and concepts are pending.
                  </p>
                )}

                {material.key_concepts.length ? (
                  <div className="flex flex-wrap gap-2">
                    {material.key_concepts.map((concept) => (
                      <Badge key={concept} variant="secondary">
                        {concept}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                <Button
                  className="pressable mt-auto"
                  variant="outline"
                  onClick={() => study.ingestMaterial(material.id)}
                  disabled={protectedDisabled || !material.storage_path}
                >
                  <BookOpen className="size-4" />
                  Ingest
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : (
        <EmptyState
          icon={FileText}
          title="No study materials yet"
          description="Your uploaded study sources will appear here."
        />
      )}
    </div>
  );
}

function IngestionBadge({ status }: { status: string }) {
  if (status === "completed") {
    return <Badge variant="success">Completed</Badge>;
  }

  if (status === "failed") {
    return <Badge variant="destructive">Failed</Badge>;
  }

  if (status === "processing") {
    return <Badge variant="warning">Processing</Badge>;
  }

  return <Badge variant="outline">Not started</Badge>;
}

function formatBytes(value: number | null | undefined) {
  if (!value) {
    return "size unknown";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
