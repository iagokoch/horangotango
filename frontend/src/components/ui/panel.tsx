import * as React from "react";

import { cn } from "@/lib/utils";

// Superfície base do sistema: borda fina, sem sombra pesada. Substitui o Card padrão do shadcn.
const Panel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-lg border bg-surface shadow-raised", className)} {...props} />
  ),
);
Panel.displayName = "Panel";

interface PanelHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  as?: "h2" | "h3";
}

function PanelHeader({ title, description, icon, actions, as: Heading = "h2", className, ...props }: PanelHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-3 border-b px-4 py-3", className)} {...props}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && <span className="mt-0.5 text-muted-foreground [&_svg]:size-4">{icon}</span>}
        <div className="min-w-0">
          <Heading className="text-base font-semibold leading-6">{title}</Heading>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  );
}

const PanelBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-4", className)} {...props} />,
);
PanelBody.displayName = "PanelBody";

function PanelFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-wrap items-center justify-end gap-2 border-t bg-surface-sunken/60 px-4 py-3", className)}
      {...props}
    />
  );
}

export { Panel, PanelBody, PanelFooter, PanelHeader };
