import { Skeleton, ListSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton className="mb-1 h-5 w-24" />
      <Skeleton className="mb-6 h-4 w-56" />
      <ListSkeleton />
    </div>
  );
}
