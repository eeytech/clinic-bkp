"use server";

import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { and, eq, ne } from "drizzle-orm"; // Import 'and' e 'ne'
import { headers } from "next/headers";
import { z } from "zod";

import { db } from "@/db";
import { appointmentsTable, doctorsTable } from "@/db/schema";
import { generateTimeSlots } from "@/helpers/time";
import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/next-safe-action";

dayjs.extend(utc);
dayjs.extend(timezone);

export const getAvailableTimes = actionClient
  .schema(
    z.object({
      doctorId: z.string(),
      date: z.string().date(), // YYYY-MM-DD
      appointmentId: z.string().uuid().optional(), // Adicionado para edição
    }),
  )
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      throw new Error("Unauthorized");
    }
    if (!session.user.clinic) {
      throw new Error("Clínica não encontrada");
    }
    const doctor = await db.query.doctorsTable.findFirst({
      where: eq(doctorsTable.id, parsedInput.doctorId),
    });
    if (!doctor) {
      throw new Error("Médico não encontrado");
    }
    const selectedDayOfWeek = dayjs(parsedInput.date).day(); // 0 (Sun) to 6 (Sat)

    // CORREÇÃO: Verifica se o dia da semana está no array 'availableWeekDays'
    const doctorIsAvailable =
      doctor.availableWeekDays.includes(selectedDayOfWeek);

    if (!doctorIsAvailable) {
      return []; // Retorna array vazio se o médico não atende nesse dia da semana
    }

    // Filtra o agendamento atual da verificação de horários
    const appointments = await db.query.appointmentsTable.findMany({
      where: and(
        eq(appointmentsTable.doctorId, parsedInput.doctorId),
        eq(appointmentsTable.clinicId, session.user.clinic.id), // Garante que busca apenas na clínica do usuário
        // Se estiver editando um agendamento, exclui ele da verificação
        parsedInput.appointmentId
          ? ne(appointmentsTable.id, parsedInput.appointmentId)
          : undefined,
      ),
      // Adiciona filtro de data para otimizar a query no banco
      // Busca agendamentos apenas para a data selecionada
      // É importante converter a data para o início e fim do dia para garantir a comparação correta
      // com o timestamp `appointmentDateTime`
      // Esta otimização assume que `appointmentDateTime` está armazenado em UTC ou similar
      // Se estiver em timezone local, pode precisar de ajuste com `dayjs-timezone`
      // Exemplo simples (pode precisar de ajuste dependendo do fuso horário do DB):
      // gte(appointmentsTable.appointmentDateTime, dayjs(parsedInput.date).startOf('day').toDate()),
      // lte(appointmentsTable.appointmentDateTime, dayjs(parsedInput.date).endOf('day').toDate())
    });

    // Filtra os agendamentos *após* a busca no banco, garantindo a lógica correta de dia
    const appointmentsOnSelectedDate = appointments
      .filter((appointment) => {
        return dayjs(appointment.appointmentDateTime).isSame(
          parsedInput.date,
          "day",
        );
      })
      .map((appointment) =>
        dayjs(appointment.appointmentDateTime).format("HH:mm:ss"),
      );

    const timeSlots = generateTimeSlots();

    // Lógica para comparar horários permanece a mesma
    const doctorAvailableFrom = dayjs()
      .utc()
      .set("hour", Number(doctor.availableFromTime.split(":")[0]))
      .set("minute", Number(doctor.availableFromTime.split(":")[1]))
      .set("second", 0)
      .local();
    const doctorAvailableTo = dayjs()
      .utc()
      .set("hour", Number(doctor.availableToTime.split(":")[0]))
      .set("minute", Number(doctor.availableToTime.split(":")[1]))
      .set("second", 0)
      .local();

    const doctorTimeSlots = timeSlots.filter((time) => {
      const date = dayjs()
        .utc()
        .set("hour", Number(time.split(":")[0]))
        .set("minute", Number(time.split(":")[1]))
        .set("second", 0);

      return (
        date.format("HH:mm:ss") >= doctorAvailableFrom.format("HH:mm:ss") &&
        date.format("HH:mm:ss") <= doctorAvailableTo.format("HH:mm:ss")
      );
    });
    return doctorTimeSlots.map((time) => {
      return {
        value: time,
        available: !appointmentsOnSelectedDate.includes(time),
        label: time.substring(0, 5),
      };
    });
  });
