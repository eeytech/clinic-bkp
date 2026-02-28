import dayjs from "dayjs";
import { and, eq, gte, lte, SQL } from "drizzle-orm";
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
import {
  appointmentsTable,
  appointmentStatusEnum,
  doctorsTable,
  patientsTable,
} from "@/db/schema";
import { auth } from "@/lib/auth";

import AddAppointmentButton from "./_components/add-appointment-button";
import { AppointmentsDataTable } from "./_components/appointments-data-table";
import { AppointmentsTableFilters } from "./_components/appointments-table-filters";
import { AppointmentWithRelations } from "./_components/table-columns";

// Interface atualizada para aceitar from e to
interface AppointmentsPageProps {
  searchParams: Promise<{
    status?: (typeof appointmentStatusEnum.enumValues)[number];
    from?: string; // Data inicial
    to?: string; // Data final
  }>;
}

const AppointmentsPage = async ({ searchParams }: AppointmentsPageProps) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    redirect("/authentication");
  }
  if (!session.user.clinic) {
    redirect("/clinic");
  }
  if (!session.user.plan) {
    redirect("/new-subscription");
  }

  const resolvedSearchParams = await searchParams;
  // Desestruturação atualizada para from e to
  const { status, from, to } = resolvedSearchParams;
  const filterFromDate = from ? dayjs(from).toDate() : undefined;
  const filterToDate = to ? dayjs(to).toDate() : undefined;
  const filterStatus = status || "agendada";

  const [patients, doctors] = await Promise.all([
    db.query.patientsTable.findMany({
      where: eq(patientsTable.clinicId, session.user.clinic.id),
    }),
    db.query.doctorsTable.findMany({
      where: eq(doctorsTable.clinicId, session.user.clinic.id),
    }),
  ]);

  const whereConditions: (SQL | undefined)[] = [
    eq(appointmentsTable.clinicId, session.user.clinic.id),
    eq(appointmentsTable.status, filterStatus),
  ];

  // Lógica de filtro de data atualizada para período
  if (filterFromDate) {
    whereConditions.push(
      gte(
        appointmentsTable.appointmentDateTime,
        dayjs(filterFromDate).startOf("day").toDate(),
      ),
    );
  }
  // Se 'to' não for definido, mas 'from' sim, filtra até o fim do dia de 'from'
  if (filterToDate || filterFromDate) {
    whereConditions.push(
      lte(
        appointmentsTable.appointmentDateTime,
        dayjs(filterToDate || filterFromDate) // Usa filterFromDate se filterToDate for nulo
          .endOf("day")
          .toDate(),
      ),
    );
  }

  const appointments = await db.query.appointmentsTable.findMany({
    where: and(...whereConditions),
    with: {
      patient: true,
      doctor: true,
    },
  });

  const adaptedAppointments = appointments.map((appointment) => ({
    ...appointment,
    doctor: {
      ...appointment.doctor,
      specialty: appointment.doctor.specialties[0] ?? "Sem especialidade",
    },
  })) as AppointmentWithRelations[];

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Agendamentos</PageTitle>
          <PageDescription>
            Gerencie os agendamentos da sua clínica
          </PageDescription>
        </PageHeaderContent>
        <PageActions>
          <AddAppointmentButton patients={patients} doctors={doctors} />
        </PageActions>
      </PageHeader>
      <PageContent>
        {/* Passa as datas iniciais para o filtro */}
        <AppointmentsTableFilters
          defaultStatus={filterStatus}
          defaultDateRange={{ from: filterFromDate, to: filterToDate }}
        />
        <AppointmentsDataTable
          data={adaptedAppointments}
          patients={patients}
          doctors={doctors}
        />
      </PageContent>
    </PageContainer>
  );
};

export default AppointmentsPage;
