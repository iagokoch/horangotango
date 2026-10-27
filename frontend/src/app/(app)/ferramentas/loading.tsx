import { Skeleton } from "@/components/ui/skeleton";
import { CatalogSkeleton } from "@/features/ferramentas/components/catalog-skeleton";

export default function Loading() {
  return (
    <>
      <div className="mb-8 space-y-3">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <CatalogSkeleton />
    </>
  );
}
