import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center p-8 text-center">
      <div className="bg-muted text-muted-foreground mb-3 flex size-10 items-center justify-center rounded-md">
        <Icon className="size-5" />
      </div>
      <h3 className="text-base font-semibold tracking-normal">{title}</h3>
      <p className="text-muted-foreground mt-1 max-w-md text-sm leading-6">{description}</p>
    </div>
  );
}
