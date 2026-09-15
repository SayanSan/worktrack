import { Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton className="mb-1 h-5 w-16" />
      <Skeleton className="mb-6 h-4 w-40" />
      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" style={{ marginLeft: (i % 3) * 24 }} />
        ))}
      </div>
    </div>
  );
}
