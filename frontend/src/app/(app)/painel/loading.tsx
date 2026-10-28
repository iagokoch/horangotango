import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="Carregando painel">
      <div className="mb-8 space-y-3">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-10 w-80 max-w-full" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>
      <Skeleton className="h-[13.5rem] rounded-xl" />
      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.7fr)_minmax(19rem,1fr)]">
        <Skeleton className="h-96 rounded-lg" />
        <div className="space-y-6">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-72 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
