import { Skeleton } from "@/components/ui/skeleton";

export function CatalogSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Carregando catálogo">
      <div className="flex flex-col gap-3 lg:flex-row">
        <Skeleton className="h-11 flex-1" />
        <div className="flex gap-2">
          <Skeleton className="h-11 flex-1 lg:w-56" />
          <Skeleton className="h-11 w-[5.5rem]" />
        </div>
      </div>
      <div className="flex gap-4 border-b pb-3">
        {Array.from({ length: 6 }, (_, indice) => (
          <Skeleton key={indice} className="h-5 w-24" />
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Skeleton className="h-10 rounded-none" />
        {Array.from({ length: 8 }, (_, indice) => (
          <div key={indice} className="flex h-14 items-center gap-4 border-t px-5">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="hidden h-4 w-28 lg:block" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
