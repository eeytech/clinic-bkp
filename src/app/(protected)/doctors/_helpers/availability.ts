// src/app/(protected)/doctors/_helpers/availability.ts
import "dayjs/locale/pt-br";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import { doctorsTable } from "@/db/schema";

dayjs.extend(utc);
dayjs.locale("pt-br");

// Define um tipo que inclui os campos de disponibilidade necessários
type DoctorAvailabilityFields = Pick<
  typeof doctorsTable.$inferSelect,
  "availableFromTime" | "availableToTime" | "availableWeekDays" // Alterado de availableFromWeekDay e availableToWeekDay
>;

// Mapeamento de número para nome do dia
const weekDayNames = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

// Retorna os horários e a lista de dias formatada
export const getAvailabilityInfo = (doctor: DoctorAvailabilityFields) => {
  const fromTime = dayjs()
    .utc()
    .set("hour", Number(doctor.availableFromTime.split(":")[0]))
    .set("minute", Number(doctor.availableFromTime.split(":")[1]))
    .set("second", Number(doctor.availableFromTime.split(":")[2] || 0))
    .local();
  const toTime = dayjs()
    .utc()
    .set("hour", Number(doctor.availableToTime.split(":")[0]))
    .set("minute", Number(doctor.availableToTime.split(":")[1]))
    .set("second", Number(doctor.availableToTime.split(":")[2] || 0))
    .local();

  // Mapeia os números dos dias para nomes e ordena
  const availableDays = doctor.availableWeekDays
    .sort((a, b) => a - b) // Ordena os números (0-6)
    .map((dayIndex) => weekDayNames[dayIndex]); // Mapeia para nomes

  return { fromTime, toTime, availableDays };
};
