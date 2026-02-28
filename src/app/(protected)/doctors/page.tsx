// src/app/(protected)/doctors/page.tsx
import { and, eq, SQL, sql } from "drizzle-orm"; // Importe 'and' e 'SQL'
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  PageActions,
  PageContainer,
  PageContent,
  PageDescription,
  PageHeader,
  PageHeaderContent,
  PageTitle,
} from "@/components/ui/page-container";
import { db } from "@/db";
import { dentalSpecialtyEnum, doctorsTable } from "@/db/schema"; // Importe dentalSpecialtyEnum
import { auth } from "@/lib/auth";

import AddDoctorButton from "./_components/add-doctor-button";
import DoctorCard, { Doctor } from "./_components/doctor-card";
import { DoctorsTableFilters } from "./_components/doctors-table-filters"; // Importe o novo componente de filtro
import { DentalSpecialty } from "./_constants"; // Importe DentalSpecialty

// Interface atualizada para aceitar specialty
interface DoctorsPageProps {
  searchParams: Promise<{
    specialty?: DentalSpecialty;
  }>;
}

const DoctorsPage = async ({ searchParams }: DoctorsPageProps) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    redirect("/authentication");
  }
  if (!session.user.plan) {
    redirect("/new-subscription");
  }
  if (!session.user.clinic) {
    redirect("/clinic");
  }

  const resolvedSearchParams = await searchParams;
  const { specialty } = resolvedSearchParams;

  // Condições de busca
  const whereConditions: (SQL | undefined)[] = [
    eq(doctorsTable.clinicId, session.user.clinic.id),
  ];

  // Adiciona filtro por especialidade se fornecido
  if (specialty) {
    // Verifica se a especialidade fornecida é válida
    if (dentalSpecialtyEnum.enumValues.includes(specialty)) {
      // Usa `sql` para checar se o array 'specialties' contém o valor
      whereConditions.push(
        sql`${specialty} = ANY (${doctorsTable.specialties})`,
      );
    }
  }

  const doctors = await db.query.doctorsTable.findMany({
    where: and(...whereConditions), // Aplica as condições
  });

  const adaptedDoctors: Doctor[] = doctors.map((doctor) => ({
    ...doctor,
    // Garante que dateOfBirth seja um Date
    dateOfBirth: new Date(doctor.dateOfBirth),
    // Garante que specialties seja um array
    specialties: (doctor.specialties as DentalSpecialty[]) || [],
  })) as Doctor[];

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Médicos</PageTitle>
          <PageDescription>Gerencie os médicos da sua clínica</PageDescription>
        </PageHeaderContent>
        <PageActions>
          <AddDoctorButton />
        </PageActions>
      </PageHeader>
      <PageContent>
        {/* Adiciona o componente de filtro */}
        <DoctorsTableFilters defaultSpecialty={specialty} />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {adaptedDoctors.map((doctor) => (
            <DoctorCard key={doctor.id} doctor={doctor} />
          ))}
        </div>
        {/* Mensagem se nenhum médico for encontrado */}
        {adaptedDoctors.length === 0 && (
          <div className="flex h-40 items-center justify-center rounded-md border border-dashed">
            <p className="text-muted-foreground">
              Nenhum médico encontrado com os filtros aplicados.
            </p>
          </div>
        )}
      </PageContent>
    </PageContainer>
  );
};

export default DoctorsPage;
