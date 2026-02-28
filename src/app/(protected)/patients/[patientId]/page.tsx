// src/app/(protected)/patients/[patientId]/page.tsx
import { and, eq } from "drizzle-orm"; // Import 'and'
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation"; // Import redirect

import { getPatientById } from "@/actions/patients/get-by-id";
import { PageContainer, PageContent } from "@/components/ui/page-container";
import { db } from "@/db";
import { doctorsTable, patientsTable } from "@/db/schema"; // Import patientsTable
import { auth } from "@/lib/auth";

import { PatientHeader } from "./_components/patient-header";
import { PatientTabs } from "./_components/patient-tabs";

interface Props {
  params: Promise<{ patientId: string }>;
}

export default async function PatientDetailPage({
  params: paramsPromise,
}: Props) {
  const params = await paramsPromise;
  const patientId = params.patientId;
  const session = await auth.api.getSession({ headers: await headers() });

  // Autenticação e Verificações Iniciais
  if (!session?.user) {
    redirect("/authentication");
  }
  if (!session.user.clinic) {
    redirect("/clinic");
  }
  if (!session.user.plan) {
    redirect("/new-subscription");
  }

  // Busca do paciente garantindo que pertence à clínica do usuário
  const patientResult = await db.query.patientsTable.findFirst({
    where: and(
      eq(patientsTable.id, patientId),
      eq(patientsTable.clinicId, session.user.clinic.id),
    ),
  });

  if (!patientResult) {
    notFound();
  }

  // Busca dos médicos da clínica (mantém igual)
  const doctors = await db.query.doctorsTable.findMany({
    where: eq(doctorsTable.clinicId, session!.user.clinic!.id),
    columns: {
      id: true,
      name: true,
      specialties: true,
    },
  });

  return (
    <PageContainer>
      {/* Passa o paciente buscado diretamente */}
      <PatientHeader patient={patientResult} />
      <PageContent>
        {/* Passa médicos para as tabs */}
        <PatientTabs patientId={patientId} doctors={doctors} />
      </PageContent>
    </PageContainer>
  );
}
