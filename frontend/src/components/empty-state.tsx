import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center p-8 text-center">
      <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </div>
      <h3 className="text-base font-semibold tracking-normal">{title}</h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
