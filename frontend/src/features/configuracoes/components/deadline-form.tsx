"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Minus, Plus, Save } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { ErrorPanel } from "@/components/shared/error-panel";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { ActionError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

import { acaoDefinirPrazo } from "../actions";

// ReturnDeadlineRequest: inteiro de 1 a 365 (decimais são recusados pela API, issue #29).
const prazoFormSchema = z.object({
  dias: z
    .string()
    .trim()
    .regex(/^\d+$/, "Use um número inteiro de dias.")
    .transform(Number)
    .pipe(z.number().int().min(1, "O prazo mínimo é 1 dia.").max(365, "O prazo máximo é 365 dias.")),
});

const SUGESTOES = [3, 7, 14, 30];

export function DeadlineForm({ diasAtuais }: { diasAtuais: number | null }) {
  const router = useRouter();
  const [erro, setErro] = useState<ActionError | null>(null);
  const form = useForm<z.input<typeof prazoFormSchema>, unknown, z.output<typeof prazoFormSchema>>({
    resolver: zodResolver(prazoFormSchema),
    defaultValues: { dias: diasAtuais ? String(diasAtuais) : "7" },
  });
  const valor = Number(useWatch({ control: form.control, name: "dias" }));

  async function salvar({ dias }: z.output<typeof prazoFormSchema>) {
    setErro(null);
    if (dias === diasAtuais) {
      toast.info("O prazo informado já é o vigente.");
      return;
    }
    const resultado = await acaoDefinirPrazo(dias);
    if (!resultado.ok) {
      setErro(resultado.error);
      return;
    }
    toast.success(`Prazo padrão definido em ${resultado.data.dias} ${resultado.data.dias === 1 ? "dia" : "dias"}.`);
    router.refresh();
  }

  function ajustar(delta: number) {
    const atual = Number.isFinite(valor) ? valor : 0;
    form.setValue("dias", String(Math.min(365, Math.max(1, atual + delta))), { shouldValidate: true });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(salvar)} noValidate className="space-y-5">
        <FormField
          control={form.control}
          name="dias"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dias corridos para devolução</FormLabel>
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" size="icon" className="size-12" onClick={() => ajustar(-1)} aria-label="Diminuir um dia">
                  <Minus aria-hidden />
                </Button>
                <FormControl>
                  <Input
                    {...field}
                    inputMode="numeric"
                    className="h-12 w-28 text-center font-display text-2xl font-bold tabular"
                    onChange={(evento) => field.onChange(evento.target.value.replace(/\D/g, "").slice(0, 3))}
                  />
                </FormControl>
                <Button type="button" variant="secondary" size="icon" className="size-12" onClick={() => ajustar(1)} aria-label="Aumentar um dia">
                  <Plus aria-hidden />
                </Button>
              </div>
              <FormDescription>Entre 1 e 365. Empréstimos já confirmados mantêm o prazo da própria retirada.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sugestões de prazo">
          {SUGESTOES.map((dias) => (
            <button
              key={dias}
              type="button"
              aria-pressed={valor === dias}
              onClick={() => form.setValue("dias", String(dias), { shouldValidate: true })}
              className={cn(
                "tabular inline-flex h-8 items-center rounded-full border px-3.5 text-sm font-medium transition-colors hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                valor === dias ? "border-brand bg-brand text-brand-foreground hover:border-brand" : "text-muted-foreground",
              )}
            >
              {dias} dias
            </button>
          ))}
        </div>
        {erro && <ErrorPanel erro={erro} titulo="Não foi possível salvar o prazo" />}
        <Button type="submit" loading={form.formState.isSubmitting}>
          {!form.formState.isSubmitting && <Save aria-hidden />}
          {diasAtuais ? "Atualizar prazo" : "Definir prazo"}
        </Button>
      </form>
    </Form>
  );
}
