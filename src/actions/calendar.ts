"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCzechHolidays } from "@/lib/holidays";
import { emitRealtimeEvent } from "@/lib/socket-server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CalendarEventData {
  id: string;
  title: string;
  description: string | null;
  date: Date;
  endDate: Date | null;
  color: string | null;
  visibility: "GLOBAL" | "PRIVATE";
  creator: { id: string; name: string | null };
}

export interface HolidayData {
  date: Date;
  name: string;
}

// ---------------------------------------------------------------------------
// Czech holiday names (matches holidays.ts order)
// ---------------------------------------------------------------------------

const HOLIDAY_NAMES: Record<string, string> = {
  "01-01": "Nový rok / Den obnovy samostatného českého státu",
  "05-01": "Svátek práce",
  "05-08": "Den vítězství",
  "07-05": "Den slovanských věrozvěstů Cyrila a Metoděje",
  "07-06": "Den upálení mistra Jana Husa",
  "09-28": "Den české státnosti",
  "10-28": "Den vzniku samostatného československého státu",
  "11-17": "Den boje za svobodu a demokracii",
  "12-24": "Štědrý den",
  "12-25": "1. svátek vánoční",
  "12-26": "2. svátek vánoční",
};

export async function getHolidaysForYear(year: number): Promise<HolidayData[]> {
  const dates = getCzechHolidays(year);
  return dates.map((d) => {
    const key = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const name = HOLIDAY_NAMES[key] ?? (d.getDay() === 5 ? "Velký pátek" : "Velikonoční pondělí");
    return { date: d, name };
  });
}

// ---------------------------------------------------------------------------
// GET EVENTS for a given month
// Shows: all GLOBAL events + user's own PRIVATE events
// Multi-day events included if they overlap the month at all
// ---------------------------------------------------------------------------

export async function getCalendarEvents(year: number, month: number): Promise<CalendarEventData[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  const events = await prisma.calendarEvent.findMany({
    where: {
      AND: [
        // Visibility: GLOBAL events + own PRIVATE events
        {
          OR: [
            { visibility: "GLOBAL" },
            { creatorId: session.user.id },
          ],
        },
        // Date overlap:
        {
          OR: [
            // Single-day events within the month
            { endDate: null, date: { gte: startOfMonth, lte: endOfMonth } },
            // Multi-day: starts before month ends AND ends after month starts
            { endDate: { gte: startOfMonth }, date: { lte: endOfMonth } },
          ],
        },
      ],
    },
    include: {
      creator: { select: { id: true, name: true } },
    },
    orderBy: { date: "asc" },
  });

  return events.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    date: e.date,
    endDate: e.endDate,
    color: e.color,
    visibility: e.visibility,
    creator: e.creator,
  }));
}

// ---------------------------------------------------------------------------
// CREATE EVENT
// - Employees: can only create PRIVATE events (personal calendar)
// - Managers/Admins: can choose GLOBAL or PRIVATE
// ---------------------------------------------------------------------------

const createEventSchema = z.object({
  title: z.string().min(1, "Název je povinný").max(200),
  description: z.string().max(2000).optional(),
  date: z.string().min(1, "Datum je povinné"),
  endDate: z.string().optional(),
  color: z.string().optional(),
  visibility: z.enum(["GLOBAL", "PRIVATE"]).default("PRIVATE"),
});

export async function createCalendarEvent(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nepřihlášen" };

  const isManagement = session.user.role === "ADMIN" || session.user.role === "MANAGER";

  const raw = {
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || undefined,
    date: formData.get("date") as string,
    endDate: (formData.get("endDate") as string) || undefined,
    color: (formData.get("color") as string) || undefined,
    visibility: (formData.get("visibility") as string) || "PRIVATE",
  };

  const parsed = createEventSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Employees can only create PRIVATE events
  const visibility = isManagement ? parsed.data.visibility : "PRIVATE";

  try {
    await prisma.calendarEvent.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description || null,
        date: new Date(parsed.data.date),
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
        color: parsed.data.color || null,
        visibility: visibility as "GLOBAL" | "PRIVATE",
        creatorId: session.user.id,
      },
    });

    emitRealtimeEvent("calendar:update", "all", {
      action: "created",
      visibility,
    }).catch(() => {});

    revalidatePath("/calendar");
    return { success: true };
  } catch (err) {
    console.error("createCalendarEvent error:", err);
    return { error: "Nepodařilo se vytvořit událost" };
  }
}

// ---------------------------------------------------------------------------
// DELETE EVENT (creator or admin only)
// ---------------------------------------------------------------------------

export async function deleteCalendarEvent(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nepřihlášen" };

  const event = await prisma.calendarEvent.findUnique({
    where: { id: eventId },
    select: { creatorId: true },
  });

  if (!event) return { error: "Událost nenalezena" };

  if (event.creatorId !== session.user.id && session.user.role !== "ADMIN") {
    return { error: "Nemáte oprávnění" };
  }

  try {
    await prisma.calendarEvent.delete({ where: { id: eventId } });

    emitRealtimeEvent("calendar:update", "all", {
      action: "deleted",
    }).catch(() => {});

    revalidatePath("/calendar");
    return { success: true };
  } catch (err) {
    console.error("deleteCalendarEvent error:", err);
    return { error: "Nepodařilo se smazat událost" };
  }
}
