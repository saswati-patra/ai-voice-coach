import * as React from "react";
import { Tabs } from "@base-ui/react/tabs";

import { cn } from "@/lib/utils";

const BaseTabs = Tabs.Root;

function BaseTabsList({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Tabs.List>) {
  return (
    <Tabs.List
      className={cn(
        "relative inline-flex h-10 items-center gap-1 rounded-md bg-muted p-1 text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

function BaseTabsTrigger({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Tabs.Tab>) {
  return (
    <Tabs.Tab
      className={cn(
        "relative z-10 inline-flex h-8 items-center justify-center rounded px-3 text-sm font-medium transition-colors outline-none data-[active]:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

function BaseTabsIndicator({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Tabs.Indicator>) {
  return (
    <Tabs.Indicator
      className={cn("absolute h-8 rounded bg-background shadow-sm transition-all", className)}
      {...props}
    />
  );
}

function BaseTabsPanel({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Tabs.Panel>) {
  return <Tabs.Panel className={cn("mt-4 outline-none", className)} {...props} />;
}

export { BaseTabs, BaseTabsIndicator, BaseTabsList, BaseTabsPanel, BaseTabsTrigger };
