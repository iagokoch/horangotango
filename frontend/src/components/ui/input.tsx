import * as React from "react";

import { cn } from "@/lib/utils";

// Campo base: borda firme, foco com o halo amarelo da marca (o que está "em mãos" agora) e erro
// sempre acompanhado de mensagem textual (FormMessage).
export const campoBase =
  "w-full rounded-md border border-input bg-surface px-3 text-base text-foreground shadow-[inset_0_1px_1px_0_hsl(var(--shadow)/0.04)] transition-[border-color,box-shadow] duration-150 placeholder:text-subtle hover:border-border-strong focus-visible:border-foreground/70 focus-visible:outline-none focus-visible:shadow-focus disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-70 aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:shadow-[0_0_0_3px_hsl(var(--destructive)/0.2)]";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input type={type} className={cn(campoBase, "h-10", className)} ref={ref} {...props} />
  ),
);
Input.displayName = "Input";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea className={cn(campoBase, "min-h-[88px] resize-y py-2.5 leading-relaxed", className)} ref={ref} {...props} />
  ),
);
Textarea.displayName = "Textarea";

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        campoBase,
        "h-10 cursor-pointer appearance-none bg-[length:16px] bg-[right_0.625rem_center] bg-no-repeat pr-9",
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23808a8d' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m7 15 5 5 5-5'/%3E%3Cpath d='m7 9 5-5 5 5'/%3E%3C/svg%3E\")]",
        className,
      )}
      {...props}
    />
  ),
);
Select.displayName = "Select";

export { Input, Select, Textarea };
