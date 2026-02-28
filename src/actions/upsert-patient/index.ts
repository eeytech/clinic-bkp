// src/actions/upsert-patient/index.ts
"use server";

import dayjs from "dayjs";
import { eq } from "drizzle-orm"; // Importar eq
import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error"; // Import isRedirectError
import { headers } from "next/headers";

import { db } from "@/db";
import { patientsTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/next-safe-action";

import { upsertPatientSchema } from "./schema";

export const upsertPatient = actionClient
  .schema(upsertPatientSchema)
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

    const { id, dateOfBirth, cadastralStatus, email, ...restData } =
      parsedInput; // Separate email

    const formattedDateOfBirth = dateOfBirth
      ? dayjs(dateOfBirth).format("YYYY-MM-DD")
      : "";

    // Base data for insert/update (excluding email initially)
    const baseData = {
      ...restData,
      dateOfBirth: formattedDateOfBirth,
      clinicId: session.user.clinic.id,
    };

    if (id) {
      // --- UPDATE ---
      // Prepare data specifically for update
      const dataToSet: Partial<typeof patientsTable.$inferInsert> = {
        ...baseData,
      };

      // Only include email in the update if it's a non-empty string
      if (email && typeof email === "string" && email.trim() !== "") {
        dataToSet.email = email;
      }
      // Note: We don't update cadastralStatus here.

      await db
        .update(patientsTable)
        .set(dataToSet) // Use the conditionally prepared data
        .where(eq(patientsTable.id, id));
    } else {
      // --- INSERT ---
      // Include email for insert (DB requires it, schema allows optional for update)
      // Throw error if email is missing during creation, as DB requires it.
      if (!email || typeof email !== "string" || email.trim() === "") {
        throw new Error("Email é obrigatório para criar um novo paciente.");
      }
      await db.insert(patientsTable).values({
        ...baseData,
        email: email, // Email is required for insert
        cadastralStatus: "active", // Default status on creation
      });
    }

    revalidatePath("/patients");
    if (id) {
      revalidatePath(`/patients/${id}`);
    }
  });
