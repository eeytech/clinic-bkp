"use server";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { db } from "@/db";
import { doctorsTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/next-safe-action";

import { upsertDoctorSchema } from "./schema";

dayjs.extend(utc);

export const upsertDoctor = actionClient
  .schema(upsertDoctorSchema)
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

    const {
      availableFromTime,
      availableToTime,
      dateOfBirth,
      // availableFromWeekDay, // REMOVIDO
      // availableToWeekDay, // REMOVIDO
      availableWeekDays, // ADICIONADO
      ...rest
    } = parsedInput;

    const availableFromTimeUTC = dayjs()
      .set("hour", parseInt(availableFromTime.split(":")[0]))
      .set("minute", parseInt(availableFromTime.split(":")[1]))
      .set("second", parseInt(availableFromTime.split(":")[2] || "0")) // Default 0
      .utc();
    const availableToTimeUTC = dayjs()
      .set("hour", parseInt(availableToTime.split(":")[0]))
      .set("minute", parseInt(availableToTime.split(":")[1]))
      .set("second", parseInt(availableToTime.split(":")[2] || "0")) // Default 0
      .utc();

    const formattedDateOfBirth = dateOfBirth
      ? dayjs(dateOfBirth).format("YYYY-MM-DD")
      : "";

    // Converte os dias da semana de string para número
    const availableWeekDaysInt = availableWeekDays.map(Number);

    const values = {
      ...rest,
      dateOfBirth: formattedDateOfBirth,
      clinicId: session.user.clinic.id,
      availableFromTime: availableFromTimeUTC.format("HH:mm:ss"),
      availableToTime: availableToTimeUTC.format("HH:mm:ss"),
      // availableFromWeekDay: parseInt(availableFromWeekDay), // REMOVIDO
      // availableToWeekDay: parseInt(availableToWeekDay), // REMOVIDO
      availableWeekDays: availableWeekDaysInt, // ADICIONADO (array de números)
    };

    if (values.id) {
      await db
        .update(doctorsTable)
        .set(values)
        .where(eq(doctorsTable.id, values.id));
    } else {
      await db.insert(doctorsTable).values(values);
    }

    revalidatePath("/doctors");
  });
