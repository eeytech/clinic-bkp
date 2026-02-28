"use server";

import dayjs from "dayjs";
import { eq } from "drizzle-orm"; // Correção: importando o 'eq'
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { db } from "@/db";
import { appointmentsTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/next-safe-action";

import { getAvailableTimes } from "../get-available-times";
import { updateAppointmentSchema } from "./schema";

export const updateAppointment = actionClient
  .schema(updateAppointmentSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      throw new Error("Unauthorized");
    }
    if (!session?.user.clinic?.id) {
      throw new Error("Clinic not found");
    }

    if (parsedInput.status !== "atendida") {
      const availableTimes = await getAvailableTimes({
        doctorId: parsedInput.doctorId,
        date: dayjs(parsedInput.date).format("YYYY-MM-DD"),
        appointmentId: parsedInput.id, // Correção aqui
      });
      if (!availableTimes?.data) {
        throw new Error("No available times");
      }
      const isTimeAvailable = availableTimes.data?.some(
        (time) => time.value === parsedInput.time && time.available,
      );
      if (!isTimeAvailable) {
        throw new Error("Time not available");
      }
    }

    const appointmentDate = dayjs(parsedInput.date)
      .set("hour", parseInt(parsedInput.time.split(":")[0]))
      .set("minute", parseInt(parsedInput.time.split(":")[1]))
      .toDate();

    await db
      .update(appointmentsTable)
      .set({
        ...parsedInput,
        appointmentDateTime: appointmentDate,
      })
      .where(eq(appointmentsTable.id, parsedInput.id));

    revalidatePath("/appointments");
    revalidatePath("/dashboard");
  });
