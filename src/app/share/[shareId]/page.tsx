import { SharedTimetable } from "@/components/timetable/SharedTimetable";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Emploi du temps partagé — PlanningPro",
  description: "Consultez un emploi du temps partagé via PlanningPro",
};

export default async function SharedTimetablePage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;

  return <SharedTimetable shareId={shareId} />;
}
