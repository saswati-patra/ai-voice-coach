import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function PageHeader({ eyebrow, title, description, action, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "border-border flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="text-primary mb-2 text-xs font-semibold tracking-normal uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-foreground text-2xl font-semibold tracking-normal sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}
