// src/app/(protected)/dashboard/page.tsx
import dayjs from "dayjs";
import { Calendar, Users } from "lucide-react"; // Mantido Users para stats card
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PageActions,
  PageContainer,
  PageContent,
  PageDescription,
  PageHeader,
  PageHeaderContent,
  PageTitle,
} from "@/components/ui/page-container";
import { getDashboard } from "@/data/get-dashboard";
import { auth } from "@/lib/auth";

import { AppointmentsDataTable } from "../appointments/_components/appointments-data-table";
import AppointmentsChart from "./_components/appointments-chart";
import { DatePicker } from "./_components/date-picker";
import StatsCards from "./_components/stats-cards";
import TopDoctors from "./_components/top-doctors";
// REMOVIDO: import TopEmployees from "./_components/top-employees";
import TopSpecialties from "./_components/top-specialties";

interface DashboardSearchParams {
  from?: string;
  to?: string;
}

interface DashboardPageProps {
  searchParams?: Promise<DashboardSearchParams>;
}

const DashboardPage = async ({ searchParams }: DashboardPageProps) => {
  const resolvedSearchParams = await searchParams;
  const from =
    typeof resolvedSearchParams?.from === "string"
      ? resolvedSearchParams.from
      : undefined;
  const to =
    typeof resolvedSearchParams?.to === "string"
      ? resolvedSearchParams.to
      : undefined;

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

  if (!from || !to) {
    redirect(
      `/dashboard?from=${dayjs().startOf("month").format("YYYY-MM-DD")}&to=${dayjs().endOf("month").format("YYYY-MM-DD")}`,
    );
  }

  const {
    totalAppointments,
    totalPatients,
    totalDoctors,
    totalEmployees, // Mantido para StatsCards
    topDoctors,
    topSpecialties,
    // REMOVIDO: topEmployees,
    todayAppointments,
    dailyAppointmentsData,
    patients,
    doctors,
  } = await getDashboard({
    from,
    to,
    session: {
      user: {
        clinic: {
          id: session.user.clinic.id,
        },
      },
    },
  });

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Dashboard</PageTitle>
          <PageDescription>
            Tenha uma visão geral da sua clínica.
          </PageDescription>
        </PageHeaderContent>
        <PageActions>
          <DatePicker />
        </PageActions>
      </PageHeader>
      <PageContent>
        {/* Passa o total de funcionários para os cards de estatísticas */}
        <StatsCards
          totalAppointments={totalAppointments.total}
          totalPatients={totalPatients.total}
          totalDoctors={totalDoctors.total}
          totalEmployees={totalEmployees.total} // Passa o total de funcionários
        />

        {/* Layout Reorganizado - Ajustado grid para 2 colunas */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-[2fr_1fr]">
          {/* Coluna 1: Agendamentos de Hoje */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Calendar className="text-muted-foreground" />
                <CardTitle className="text-base">
                  Agendamentos de hoje ({todayAppointments.length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {/* Garante que a tabela não tenha paginação e seja rolável se necessário */}
              <div className="max-h-[400px] overflow-y-auto">
                <AppointmentsDataTable
                  data={todayAppointments}
                  patients={patients}
                  doctors={doctors}
                />
              </div>
            </CardContent>
          </Card>

          {/* Coluna 2: Top Médicos */}
          <TopDoctors doctors={topDoctors} />

          {/* REMOVIDO: Coluna 3: Top Funcionários */}
          {/* <TopEmployees employees={topEmployees} /> */}
        </div>

        {/* Linha 2: Gráfico de Agendamentos e Top Especialidades */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
          {/* Gráfico */}
          <AppointmentsChart dailyAppointmentsData={dailyAppointmentsData} />

          {/* Especialidades */}
          <TopSpecialties topSpecialties={topSpecialties} />
        </div>
      </PageContent>
    </PageContainer>
  );
};

export default DashboardPage;
