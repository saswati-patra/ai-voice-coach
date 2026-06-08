import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Cloud, FileText, Mic, Sparkles } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VoiceCoachWorkspace } from "@/hooks/use-voice-coach-workspace";
import { cn } from "@/lib/utils";

type DashboardPageProps = {
  workspace: VoiceCoachWorkspace;
};

export function DashboardPage({ workspace }: DashboardPageProps) {
  const { auth, review, study, voice } = workspace;
  const ingestedCount = study.materials.filter(
    (material) => material.ingestion_status === "completed"
  ).length;
  const conceptPreview = Array.from(
    new Set(
      study.materials
        .flatMap((material) => material.key_concepts)
        .concat(review.items.map((item) => item.concept))
    )
  ).slice(0, 8);
  const recentMaterials = study.materials.slice(0, 3);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Your study loop, ready to run"
        description="Study sources, generated review work, and live practice in one focused workspace."
        action={
          <Button variant="default" onClick={() => auth.refreshData()}>
            <Sparkles className="size-4" />
            Sync
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={FileText}
          label="Materials"
          value={study.materials.length}
          detail={`${ingestedCount} ingested`}
        />
        <MetricCard
          icon={BookOpen}
          label="Review Items"
          value={review.items.length}
          detail="Generated from study docs"
        />
        <MetricCard icon={Mic} label="Voice" value={voice.status} detail="Live session harness" />
        <MetricCard
          icon={Cloud}
          label="Backend"
          value={auth.requiresFirebaseAuth ? "Signed" : "Local"}
          detail={auth.apiTarget}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Recent Materials</CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                Latest source files in this workspace.
              </p>
            </div>
            <Link
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              to="/app/study"
            >
              Open
              <ArrowRight className="size-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentMaterials.length ? (
              <div className="divide-border border-border divide-y rounded-lg border">
                {recentMaterials.map((material) => (
                  <div key={material.id} className="flex items-start justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold tracking-normal">
                        {material.title}
                      </h3>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {material.source_type} / {material.ingestion_status.replace("_", " ")}
                      </p>
                    </div>
                    <IngestionBadge status={material.ingestion_status} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title="No materials yet"
                description="Uploaded source files will appear here."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Concept Radar</CardTitle>
            <p className="text-muted-foreground text-sm">Concepts appear here after ingestion.</p>
          </CardHeader>
          <CardContent>
            {conceptPreview.length ? (
              <div className="flex flex-wrap gap-2">
                {conceptPreview.map((concept) => (
                  <Badge key={concept} variant="secondary">
                    {concept}
                  </Badge>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Sparkles}
                title="Nothing to review yet"
                description="Generated concepts will appear here."
              />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

type MetricCardProps = {
  icon: typeof FileText;
  label: string;
  value: number | string;
  detail: string;
};

function MetricCard({ icon: Icon, label, value, detail }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="bg-accent text-accent-foreground flex size-11 shrink-0 items-center justify-center rounded-lg">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-medium tracking-normal uppercase">
            {label}
          </p>
          <p className="mt-1 truncate text-xl font-semibold tracking-normal">{value}</p>
          <p className="text-muted-foreground mt-1 truncate text-xs">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function IngestionBadge({ status }: { status: string }) {
  if (status === "completed") {
    return <Badge variant="success">Ready</Badge>;
  }

  if (status === "failed") {
    return <Badge variant="destructive">Failed</Badge>;
  }

  if (status === "processing") {
    return <Badge variant="warning">Processing</Badge>;
  }

  return <Badge variant="outline">Not started</Badge>;
}
