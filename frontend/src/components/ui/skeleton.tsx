import { cn } from "@/lib/utils";

// Placeholder de carregamento com brilho que corre devagar; sem movimento quando o sistema pede
// menos animação (regra global em globals.css).
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-shimmer rounded-md bg-[linear-gradient(90deg,hsl(var(--muted))_0%,hsl(var(--muted))_40%,hsl(var(--surface-sunken))_50%,hsl(var(--muted))_60%,hsl(var(--muted))_100%)] bg-[length:200%_100%]",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
