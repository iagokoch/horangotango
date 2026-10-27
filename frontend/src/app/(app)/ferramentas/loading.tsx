import { Skeleton } from "@/components/ui/skeleton";
import { CatalogSkeleton } from "@/features/ferramentas/components/catalog-skeleton";

export default function Loading() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <CatalogSkeleton />
    </>
  );
}
