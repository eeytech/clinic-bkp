// src/app/(protected)/financials/page.tsx
import dayjs from "dayjs";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import React, { Suspense } from "react"; // Import Suspense

import {
  PageContainer,
  PageContent,
  PageDescription,
  PageHeader,
  PageHeaderContent,
  PageTitle,
} from "@/components/ui/page-container";
import { Skeleton } from "@/components/ui/skeleton"; // For Suspense fallback
import { db } from "@/db";
import {
  clinicFinancialOperationEnum, // Import enums for validation
  clinicFinancialStatusEnum,
  doctorsTable,
  employeesTable,
  patientsTable,
} from "@/db/schema"; // Import necessary tables
import { auth } from "@/lib/auth";

import FinancialDashboard from "./_components/financial-dashboard";
import { FinancialsFilters } from "./_components/financials-filters";

// Define the expected structure inside the Promise
interface FinancialsSearchParams {
  from?: string;
  to?: string;
  status?: (typeof clinicFinancialStatusEnum.enumValues)[number];
  operation?: (typeof clinicFinancialOperationEnum.enumValues)[number];
}

// Type searchParams as a Promise containing the expected structure
interface FinancialsPageProps {
  searchParams?: Promise<FinancialsSearchParams>;
}

export default async function FinancialsPage({
  searchParams,
}: FinancialsPageProps) {
  // Use the Promise type
  // Await the searchParams promise
  const resolvedSearchParams = await searchParams;

  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) redirect("/authentication");
  if (!session.user.clinic) redirect("/clinic");
  if (!session.user.plan) redirect("/new-subscription");

  const clinicId = session.user.clinic.id;

  // Fetch data needed for filters/forms concurrently
  const [patients, employees, doctors] = await Promise.all([
    db.query.patientsTable.findMany({
      where: eq(patientsTable.clinicId, clinicId),
      columns: { id: true, name: true }, // Select only needed columns
    }),
    db.query.employeesTable.findMany({
      where: eq(employeesTable.clinicId, clinicId),
      columns: { id: true, name: true }, // Select only needed columns
    }),
    db.query.doctorsTable.findMany({
      where: eq(doctorsTable.clinicId, clinicId),
      columns: { id: true, name: true }, // Select only needed columns
    }),
  ]);

  // Combine employees and doctors for the payment select
  const employeesAndDoctors = [
    ...employees.map((e) => ({ id: e.id, name: e.name })),
    ...doctors.map((d) => ({ id: d.id, name: `${d.name} (Médico)` })),
  ].sort((a, b) => a.name.localeCompare(b.name));

  // Use the resolved searchParams object
  const fromParam = resolvedSearchParams?.from;
  const toParam = resolvedSearchParams?.to;
  const statusParam = resolvedSearchParams?.status;
  const operationParam = resolvedSearchParams?.operation;

  // Ensure params are strings before using them (logic remains the same)
  const from =
    typeof fromParam === "string"
      ? fromParam
      : dayjs().startOf("month").format("YYYY-MM-DD");
  const to =
    typeof toParam === "string"
      ? toParam
      : dayjs().endOf("month").format("YYYY-MM-DD");
  const status = typeof statusParam === "string" ? statusParam : undefined;
  const operation =
    typeof operationParam === "string" ? operationParam : undefined;

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Financeiro da Clínica</PageTitle>
          <PageDescription>
            Acompanhe as receitas, despesas e o balanço geral da sua clínica.
          </PageDescription>
        </PageHeaderContent>
      </PageHeader>
      <PageContent>
        <Suspense fallback={<Skeleton className="mb-4 h-16 w-full" />}>
          {/* Pass resolved params to filters if needed, or let filters handle URL state */}
          <FinancialsFilters />
        </Suspense>
        <Suspense
          fallback={
            <div className="grid gap-4 md:grid-cols-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          }
        >
          <FinancialDashboard
            clinicId={clinicId}
            filterParams={{ from, to, status, operation }} // Pass resolved params
            patients={patients}
            employeesAndDoctors={employeesAndDoctors}
          />
        </Suspense>
      </PageContent>
    </PageContainer>
  );
}
