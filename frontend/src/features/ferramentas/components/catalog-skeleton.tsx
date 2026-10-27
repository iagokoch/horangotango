import { Skeleton } from "@/components/ui/skeleton";

export function CatalogSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Carregando catálogo">
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-52" />
        <Skeleton className="h-10 w-20" />
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: 6 }, (_, indice) => (
          <Skeleton key={indice} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border bg-surface">
        <Skeleton className="h-9 rounded-none" />
        {Array.from({ length: 8 }, (_, indice) => (
          <div key={indice} className="flex items-center gap-4 border-t px-4 py-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="hidden h-4 w-28 md:block" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
