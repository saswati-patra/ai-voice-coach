import { BookOpenCheck, Circle, Layers, Trophy } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VoiceCoachWorkspace } from "@/hooks/use-voice-coach-workspace";

type ReviewPageProps = {
  workspace: VoiceCoachWorkspace;
};

const statusCopy = {
  needs_review: {
    label: "Needs Review",
    icon: Circle,
    description: "Fresh concepts to practice soon.",
  },
  learning: {
    label: "Learning",
    icon: Layers,
    description: "Ideas in active recall rotation.",
  },
  mastered: {
    label: "Mastered",
    icon: Trophy,
    description: "Concepts you are keeping warm.",
  },
} as const;

export function ReviewPage({ workspace }: ReviewPageProps) {
  const { review } = workspace;

  const grouped = review.items.reduce(
    (accumulator, item) => {
      accumulator[item.status].push(item);
      return accumulator;
    },
    {
      learning: [],
      mastered: [],
      needs_review: [],
    } as Record<keyof typeof statusCopy, typeof review.items>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Review"
        title="Practice queue"
        description="Concept lanes for active recall and spoken practice."
      />

      {review.items.length ? (
        <section className="grid gap-4 lg:grid-cols-3">
          {(Object.keys(statusCopy) as Array<keyof typeof statusCopy>).map((status) => {
            const StatusIcon = statusCopy[status].icon;
            return (
              <Card key={status} className="surface-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <StatusIcon className="text-primary size-4" />
                    {statusCopy[status].label}
                  </CardTitle>
                  <p className="text-muted-foreground text-sm">{statusCopy[status].description}</p>
                </CardHeader>
                <CardContent>
                  {grouped[status].length ? (
                    <div className="flex flex-wrap gap-2">
                      {grouped[status].map((item) => (
                        <Badge
                          key={item.id}
                          variant={status === "mastered" ? "success" : "secondary"}
                        >
                          {item.concept}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No concepts in this lane.</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </section>
      ) : (
        <EmptyState
          icon={BookOpenCheck}
          title="No review items yet"
          description="Generated review concepts will appear here."
        />
      )}
    </div>
  );
}
