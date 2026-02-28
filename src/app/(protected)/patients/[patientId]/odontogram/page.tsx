// src/app/(protected)/patients/[patientId]/odontogram/page.tsx
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import * as React from "react";

import {
  PageContainer,
  PageContent,
  PageDescription,
  PageHeader,
  PageHeaderContent,
  PageTitle,
} from "@/components/ui/page-container";
import { db } from "@/db";
import { doctorsTable, patientsTable } from "@/db/schema";
import { auth } from "@/lib/auth";

// Importe o OdontogramTab que já contém o Provider
import OdontogramTab from "../_components/odontogram-tab";

interface Props {
  params: Promise<{ patientId: string }>;
}

export default async function OdontogramPage({ params: paramsPromise }: Props) {
  const params = await paramsPromise;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/authentication");
  }
  if (!session.user.clinic) {
    redirect("/clinic");
  }
  if (!session.user.plan) {
    redirect("/new-subscription");
  }

  const patientPromise = db.query.patientsTable.findFirst({
    where: eq(patientsTable.id, params.patientId),
  });

  const doctorsPromise = db.query.doctorsTable.findMany({
    where: eq(doctorsTable.clinicId, session.user.clinic.id),
    columns: {
      id: true,
      name: true,
      specialties: true,
    },
  });

  const [patient, doctors] = await Promise.all([
    patientPromise,
    doctorsPromise,
  ]);

  if (!patient || patient.clinicId !== session.user.clinic.id) {
    notFound();
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Odontograma de {patient.name}</PageTitle>
          <PageDescription>
            Visualize e registre as marcações dentárias do paciente.
          </PageDescription>
        </PageHeaderContent>
      </PageHeader>
      <PageContent>
        {/* Substitua o div pelo componente OdontogramTab */}
        <OdontogramTab patientId={params.patientId} doctors={doctors} />
      </PageContent>
    </PageContainer>
  );
}
