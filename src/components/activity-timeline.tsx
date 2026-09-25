import { Activity } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { formatRelativeTime } from "@/lib/utils";

export interface ActivityItem {
  id: string;
  message: string;
  created_at: string;
  actor: { name: string } | null;
}

export function ActivityTimeline({ activities }: { activities: ActivityItem[] }) {
  if (activities.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No activity yet"
        description="Task updates will show up here as they happen."
      />
    );
  }

  return (
    <Card className="divide-y divide-slate-100 p-0">
      {activities.map((item) => (
        <div key={item.id} className="flex items-start gap-3 px-4 py-3">
          <Avatar name={item.actor?.name ?? "?"} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-700">{item.message}</p>
            <p className="mt-0.5 text-xs text-slate-400">{formatRelativeTime(item.created_at)}</p>
          </div>
        </div>
      ))}
    </Card>
  );
}
