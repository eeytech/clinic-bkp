// src/actions/delete-employee/index.ts
"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { db } from "@/db";
import { employeesTable } from "@/db/schema"; // Importa a nova tabela
import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/next-safe-action";

export const deleteEmployee = actionClient
  .schema(
    z.object({
      id: z.string().uuid(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      throw new Error("Unauthorized");
    }
    const employee = await db.query.employeesTable.findFirst({
      // Busca na tabela de funcionários
      where: eq(employeesTable.id, parsedInput.id),
    });
    if (!employee) {
      throw new Error("Funcionário não encontrado");
    }
    if (employee.clinicId !== session.user.clinic?.id) {
      throw new Error("Funcionário não encontrado");
    }
    await db
      .delete(employeesTable)
      .where(eq(employeesTable.id, parsedInput.id)); // Deleta da tabela de funcionários
    revalidatePath("/employees"); // Revalida a página de funcionários
  });
