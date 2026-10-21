import { useFormatter, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { isoDateToUtc } from "@/lib/dates";
import { getBoardGroup, type BoardState } from "@/lib/rooms/board-state";

// Colour by board group; the text always says the state, so colour is
// never the only cue.
const GROUP_CLASSES = {
  free: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  soon: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  occupied: "bg-secondary text-secondary-foreground",
  unavailable: "border-border text-muted-foreground",
} as const;

// `today`: the same ISO date the state was computed with.
export function RoomStateBadge({
  state,
  today,
}: {
  state: BoardState;
  today: string;
}) {
  const t = useTranslations("roomState");
  const format = useFormatter();
  // Calendar dates: format in UTC so the day never shifts.
  const date = (value: string) =>
    format.dateTime(isoDateToUtc(value), {
      dateStyle: "medium",
      timeZone: "UTC",
    });

  let label: string;
  switch (state.kind) {
    case "free":
    case "occupied":
    case "unavailable":
      label = t(state.kind);
      break;
    case "freeFrom":
    case "overdue":
      label = t(state.kind, { date: date(state.date) });
      break;
    case "freesUp":
      label =
        state.date === today
          ? t("freesUpToday")
          : t("freesUp", { date: date(state.date) });
      break;
  }

  return (
    <Badge variant="outline" className={GROUP_CLASSES[getBoardGroup(state)]}>
      {label}
    </Badge>
  );
}
