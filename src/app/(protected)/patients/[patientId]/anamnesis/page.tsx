// src/app/(protected)/patients/[patientId]/anamnesis/page.tsx
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
import { patientsTable } from "@/db/schema";
import { auth } from "@/lib/auth";

import AnamnesisView from "./_components/anamnesis-view"; // Importe o novo componente

interface Props {
  params: Promise<{ patientId: string }>;
}

export default async function AnamnesisPage({ params: paramsPromise }: Props) {
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

  const patient = await db.query.patientsTable.findFirst({
    where: eq(patientsTable.id, params.patientId),
  });

  if (!patient || patient.clinicId !== session.user.clinic.id) {
    notFound();
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Ficha Clínica (Anamnese) de {patient.name}</PageTitle>
          <PageDescription>
            Crie, edite e visualize o histórico de anamneses do paciente.
          </PageDescription>
        </PageHeaderContent>
      </PageHeader>
      <PageContent>
        {/* Use o novo componente wrapper que é um Client Component */}
        <AnamnesisView patientId={params.patientId} />
      </PageContent>
    </PageContainer>
  );
}
