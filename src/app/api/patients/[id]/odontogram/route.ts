import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import {
  odontogramMarksTable,
  odontogramsTable,
  odontogramStatusEnum,
  patientsTable,
  toothFaceEnum,
} from "@/db/schema";
import { auth } from "@/lib/auth";

const zOdontogramMark = z.object({
  id: z.string().uuid().optional(),
  toothNumber: z.string().min(1),
  face: z.enum(toothFaceEnum.enumValues),
  status: z.enum(odontogramStatusEnum.enumValues),
  observation: z.string().optional().nullable(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: patientId } = await params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || !session.user.clinic?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patient = await db.query.patientsTable.findFirst({
      where: and(
        eq(patientsTable.id, patientId),
        eq(patientsTable.clinicId, session.user.clinic.id),
      ),
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const odontograms = await db.query.odontogramsTable.findMany({
      where: eq(odontogramsTable.patientId, patientId),
      orderBy: (odontograms, { desc }) => [desc(odontograms.date)],
      with: {
        marks: true,
        doctor: {
          columns: {
            name: true,
            id: true,
          },
        },
      },
    });

    return NextResponse.json(odontograms);
  } catch (error) {
    console.error("GET Odontogram Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: patientId } = await params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || !session.user.clinic?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const validationSchema = z.object({
      marks: z.array(zOdontogramMark),
      doctorId: z.string().uuid(),
      date: z.string().date(),
    });

    const result = validationSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: result.error },
        { status: 400 },
      );
    }

    const { marks, doctorId, date } = result.data;

    const patient = await db.query.patientsTable.findFirst({
      where: and(
        eq(patientsTable.id, patientId),
        eq(patientsTable.clinicId, session.user.clinic.id),
      ),
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const [newOdontogram] = await db
      .insert(odontogramsTable)
      .values({
        patientId: patientId,
        clinicId: session.user.clinic.id,
        doctorId: doctorId,
        date: date,
      })
      .returning({ id: odontogramsTable.id });
    const newOdontogramId = newOdontogram.id;

    if (marks.length > 0) {
      const newMarks = marks.map((mark) => ({
        ...mark,
        odontogramId: newOdontogramId,
      }));
      await db.insert(odontogramMarksTable).values(newMarks);
    }

    revalidatePath(`/patients/${patientId}/odontogram`);

    return NextResponse.json({
      success: true,
      odontogramId: newOdontogramId,
    });
  } catch (error) {
    console.error("POST Odontogram Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
