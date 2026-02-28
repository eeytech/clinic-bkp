// src/data/get-dashboard.ts
import dayjs from "dayjs";
import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  appointmentsTable,
  doctorsTable,
  employeesTable,
  patientsTable,
} from "@/db/schema";

interface Params {
  from: string; // Data de início do período selecionado pelo usuário
  to: string; // Data de fim do período selecionado pelo usuário
  session: {
    user: {
      clinic: {
        id: string;
      };
    };
  };
}

export const getDashboard = async ({ from, to, session }: Params) => {
  // Datas fixas para o gráfico (10 dias antes e 10 depois de hoje)
  const chartStartDate = dayjs().subtract(10, "days").startOf("day").toDate();
  const chartEndDate = dayjs().add(10, "days").endOf("day").toDate();
  const clinicId = session.user.clinic.id;

  const [
    [totalAppointments], // Filtrado pelo período selecionado (from, to)
    [totalPatients], // Total geral
    [totalDoctors], // Total geral
    [totalEmployees], // Total geral (Mantido para StatsCards)
    topDoctors, // Filtrado pelo período selecionado (from, to)
    topSpecialties, // Filtrado pelo período selecionado (from, to)
    // REMOVIDO: topEmployees,
    todayAppointments, // Filtrado apenas pelo dia atual
    dailyAppointmentsData, // Filtrado pelo período fixo do gráfico (chartStartDate, chartEndDate)
    patients, // Usado na tabela de hoje
    doctors, // Usado na tabela de hoje
  ] = await Promise.all([
    // 1. Total de Agendamentos (no período selecionado)
    db
      .select({ total: count() })
      .from(appointmentsTable)
      .where(
        and(
          eq(appointmentsTable.clinicId, clinicId),
          gte(appointmentsTable.appointmentDateTime, new Date(from)),
          lte(appointmentsTable.appointmentDateTime, new Date(to)),
        ),
      ),
    // 2. Total de Pacientes (geral)
    db
      .select({ total: count() })
      .from(patientsTable)
      .where(eq(patientsTable.clinicId, clinicId)),
    // 3. Total de Médicos (geral)
    db
      .select({ total: count() })
      .from(doctorsTable)
      .where(eq(doctorsTable.clinicId, clinicId)),
    // 4. Total de Funcionários (geral) (Mantido para StatsCards)
    db
      .select({ total: count() })
      .from(employeesTable)
      .where(eq(employeesTable.clinicId, clinicId)),
    // 5. Top Médicos (no período selecionado)
    db
      .select({
        id: doctorsTable.id,
        name: doctorsTable.name,
        avatarImageUrl: doctorsTable.avatarImageUrl,
        specialty: sql<string>`${doctorsTable.specialties}[1]`.as("specialty"),
        appointments: count(appointmentsTable.id),
      })
      .from(doctorsTable)
      .leftJoin(
        appointmentsTable,
        and(
          eq(appointmentsTable.doctorId, doctorsTable.id),
          // Filtro de data aqui
          gte(appointmentsTable.appointmentDateTime, new Date(from)),
          lte(appointmentsTable.appointmentDateTime, new Date(to)),
        ),
      )
      .where(eq(doctorsTable.clinicId, clinicId))
      .groupBy(doctorsTable.id, sql`${doctorsTable.specialties}[1]`)
      .orderBy(desc(count(appointmentsTable.id)))
      .limit(10),
    // 6. Top Especialidades (no período selecionado)
    db
      .select({
        specialty: sql<string>`unnest(${doctorsTable.specialties})`.as(
          "specialty",
        ),
        appointments: count(appointmentsTable.id),
      })
      .from(appointmentsTable)
      .innerJoin(doctorsTable, eq(appointmentsTable.doctorId, doctorsTable.id))
      .where(
        and(
          eq(appointmentsTable.clinicId, clinicId),
          // Filtro de data aqui
          gte(appointmentsTable.appointmentDateTime, new Date(from)),
          lte(appointmentsTable.appointmentDateTime, new Date(to)),
        ),
      )
      .groupBy(sql`unnest(${doctorsTable.specialties})`)
      .orderBy(desc(count(appointmentsTable.id))),
    // REMOVIDO: Busca por topEmployees (índice 7 original)
    // 7. Agendamentos de Hoje (filtrado apenas pela data atual)
    db.query.appointmentsTable.findMany({
      where: and(
        eq(appointmentsTable.clinicId, clinicId),
        gte(
          appointmentsTable.appointmentDateTime,
          dayjs().startOf("day").toDate(), // Início do dia atual
        ),
        lte(
          appointmentsTable.appointmentDateTime,
          dayjs().endOf("day").toDate(), // Fim do dia atual
        ),
      ),
      orderBy: (appointments, { asc }) => [
        asc(appointments.appointmentDateTime),
      ], // Ordena por hora
      with: {
        patient: true,
        doctor: true,
      },
    }),
    // 8. Dados Diários para o Gráfico (período fixo de 21 dias)
    db
      .select({
        date: sql<string>`DATE(${appointmentsTable.appointmentDateTime})`.as(
          "date",
        ),
        appointments: count(appointmentsTable.id),
      })
      .from(appointmentsTable)
      .where(
        and(
          eq(appointmentsTable.clinicId, clinicId),
          gte(appointmentsTable.appointmentDateTime, chartStartDate), // Usa data fixa do gráfico
          lte(appointmentsTable.appointmentDateTime, chartEndDate), // Usa data fixa do gráfico
        ),
      )
      .groupBy(sql`DATE(${appointmentsTable.appointmentDateTime})`)
      .orderBy(sql`DATE(${appointmentsTable.appointmentDateTime})`),
    // 9. Busca de Pacientes (para tabela de hoje)
    db.query.patientsTable.findMany({
      where: eq(patientsTable.clinicId, clinicId),
    }),
    // 10. Busca de Médicos (para tabela de hoje)
    db.query.doctorsTable.findMany({
      where: eq(doctorsTable.clinicId, clinicId),
    }),
  ]);

  const adaptedTodayAppointments = todayAppointments.map((a) => ({
    ...a,
    doctor: {
      ...a.doctor,
      specialty: a.doctor.specialties[0] ?? "Sem especialidade",
    },
  }));

  return {
    totalAppointments, // Filtrado pelo período selecionado
    totalPatients, // Total geral
    totalDoctors, // Total geral
    totalEmployees, // Total geral (Mantido para StatsCards)
    topDoctors: topDoctors as any, // Filtrado pelo período selecionado
    topSpecialties: topSpecialties as any, // Filtrado pelo período selecionado
    // REMOVIDO: topEmployees,
    todayAppointments: adaptedTodayAppointments, // Apenas de hoje
    dailyAppointmentsData, // Para o gráfico (21 dias)
    patients,
    doctors,
  };
};
