import { Skeleton, ListSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton className="mb-4 h-3 w-16" />
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_260px]">
        <div>
          <Skeleton className="mb-3 h-4 w-16" />
          <ListSkeleton />
        </div>
        <div className="space-y-2">
          <Skeleton className="mb-3 h-4 w-20" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </div>
  );
}
