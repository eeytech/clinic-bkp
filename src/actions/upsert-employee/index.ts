// src/actions/upsert-employee/index.ts
"use server";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { db } from "@/db";
import { employeesTable } from "@/db/schema"; // Importa a nova tabela
import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/next-safe-action";

import { upsertEmployeeSchema } from "./schema"; // Importa o novo schema

dayjs.extend(utc);

export const upsertEmployee = actionClient
  .schema(upsertEmployeeSchema)
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
      availableFromWeekDay,
      availableToWeekDay,
      ...rest
    } = parsedInput;

    const availableFromTimeUTC = dayjs()
      .set("hour", parseInt(availableFromTime.split(":")[0]))
      .set("minute", parseInt(availableFromTime.split(":")[1]))
      .set("second", parseInt(availableFromTime.split(":")[2] || "0")) // Default to 0 if seconds are missing
      .utc();
    const availableToTimeUTC = dayjs()
      .set("hour", parseInt(availableToTime.split(":")[0]))
      .set("minute", parseInt(availableToTime.split(":")[1]))
      .set("second", parseInt(availableToTime.split(":")[2] || "0")) // Default to 0 if seconds are missing
      .utc();

    const formattedDateOfBirth = dateOfBirth
      ? dayjs(dateOfBirth).format("YYYY-MM-DD")
      : "";

    const values = {
      ...rest,
      dateOfBirth: formattedDateOfBirth,
      clinicId: session.user.clinic.id,
      availableFromTime: availableFromTimeUTC.format("HH:mm:ss"),
      availableToTime: availableToTimeUTC.format("HH:mm:ss"),
      availableFromWeekDay: parseInt(availableFromWeekDay),
      availableToWeekDay: parseInt(availableToWeekDay),
      // role já está incluído em ...rest
    };

    if (values.id) {
      await db
        .update(employeesTable) // Atualiza na tabela de funcionários
        .set(values)
        .where(eq(employeesTable.id, values.id));
    } else {
      await db.insert(employeesTable).values(values); // Insere na tabela de funcionários
    }

    revalidatePath("/employees"); // Revalida a página de funcionários
  });
