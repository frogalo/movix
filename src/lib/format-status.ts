export interface FormattedStatus {
  label: string;
  colorClass: string;
  bgClass: string;
}

export function formatTvStatus(status: string | null | undefined): FormattedStatus {
  const normalized = (status || "").toLowerCase().trim();

  switch (normalized) {
    case "continuing":
    case "watching":
      return {
        label: "Watching",
        colorClass: "text-teal-400",
        bgClass: "bg-teal-500/10 text-teal-400 border border-teal-500/25",
      };
    case "up_to_date":
    case "up to date":
    case "uptodate":
      return {
        label: "Up to Date",
        colorClass: "text-emerald-400",
        bgClass: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25",
      };
    case "completed":
      return {
        label: "Completed",
        colorClass: "text-emerald-400",
        bgClass: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25",
      };
    case "plan_to_watch":
    case "plan to watch":
    case "plantowatch":
      return {
        label: "Plan to Watch",
        colorClass: "text-blue-400",
        bgClass: "bg-blue-500/10 text-blue-400 border border-blue-500/25",
      };
    case "dropped":
      return {
        label: "Dropped",
        colorClass: "text-red-400",
        bgClass: "bg-red-500/10 text-red-400 border border-red-500/25",
      };
    case "not_started_yet":
    case "not_started":
    case "not started":
      return {
        label: "Not Started",
        colorClass: "text-zinc-400",
        bgClass: "bg-zinc-500/10 text-zinc-400 border border-zinc-500/25",
      };
    case "ended":
      return {
        label: "Ended",
        colorClass: "text-zinc-400",
        bgClass: "bg-zinc-500/10 text-zinc-400 border border-zinc-500/25",
      };
    case "canceled":
    case "cancelled":
      return {
        label: "Canceled",
        colorClass: "text-rose-400",
        bgClass: "bg-rose-500/10 text-rose-400 border border-rose-500/25",
      };
    case "returning_series":
    case "returning series":
      return {
        label: "Returning Series",
        colorClass: "text-purple-400",
        bgClass: "bg-purple-500/10 text-purple-400 border border-purple-500/25",
      };
    case "in_production":
    case "in production":
      return {
        label: "In Production",
        colorClass: "text-amber-400",
        bgClass: "bg-amber-500/10 text-amber-400 border border-amber-500/25",
      };
    default: {
      const formattedLabel = normalized
        ? normalized
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase())
        : "Tracked";
      return {
        label: formattedLabel,
        colorClass: "text-purple-400",
        bgClass: "bg-purple-500/10 text-purple-400 border border-purple-500/25",
      };
    }
  }
}
