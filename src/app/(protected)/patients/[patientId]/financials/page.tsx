import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import * as React from "react";

import { getPatientFinances } from "@/actions/patient-finances";
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

import FinancialDashboard from "./_components/financial-dashboard";

// Interface para as props da página, tratando `params` como uma Promise
interface PatientFinancialsPageProps {
  params: Promise<{ patientId: string }>;
}

export default async function PatientFinancialsPage({
  params: paramsPromise,
}: PatientFinancialsPageProps) {
  const params = await paramsPromise; // Resolve a Promise para obter o objeto de parâmetros
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
    where: and(
      eq(patientsTable.id, params.patientId),
      eq(patientsTable.clinicId, session.user.clinic.id),
    ),
  });

  if (!patient) {
    notFound();
  }

  const initialFinances = await getPatientFinances({
    patientId: params.patientId,
  });

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Financeiro de {patient.name}</PageTitle>
          <PageDescription>
            Gerencie as cobranças e pagamentos do paciente.
          </PageDescription>
        </PageHeaderContent>
      </PageHeader>
      <PageContent>
        <FinancialDashboard
          patient={patient}
          initialFinances={initialFinances?.data || []}
        />
      </PageContent>
    </PageContainer>
  );
}
