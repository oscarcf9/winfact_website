import { db } from "@/db";
import { contentCalendar } from "@/db/schema";
import { desc } from "drizzle-orm";
import { ContentCalendar } from "@/components/admin/content-calendar";

export default async function AdminCalendarPage() {
  const items = await db.select().from(contentCalendar).orderBy(desc(contentCalendar.scheduledDate)).limit(200);
  return <ContentCalendar items={items} />;
}
