// src/app/(protected)/employees/_helpers/availability.ts
import "dayjs/locale/pt-br";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import { employeesTable } from "@/db/schema"; // Importa a tabela de funcionários

dayjs.extend(utc);
dayjs.locale("pt-br");

// Define um tipo que inclui apenas os campos de disponibilidade necessários
type EmployeeAvailabilityFields = Pick<
  typeof employeesTable.$inferSelect, // Usa a tabela de funcionários
  | "availableFromTime"
  | "availableToTime"
  | "availableFromWeekDay"
  | "availableToWeekDay"
>;

// O tipo de entrada agora é mais permissivo e compatível com a interface 'Employee'
export const getAvailability = (employee: EmployeeAvailabilityFields) => {
  // Renomeado parâmetro para 'employee'
  const from = dayjs()
    .utc()
    .day(employee.availableFromWeekDay)
    .set("hour", Number(employee.availableFromTime.split(":")[0]))
    .set("minute", Number(employee.availableFromTime.split(":")[1]))
    .set("second", Number(employee.availableFromTime.split(":")[2] || 0))
    .local();
  const to = dayjs()
    .utc()
    .day(employee.availableToWeekDay)
    .set("hour", Number(employee.availableToTime.split(":")[0]))
    .set("minute", Number(employee.availableToTime.split(":")[1]))
    .set("second", Number(employee.availableToTime.split(":")[2] || 0))
    .local();
  return { from, to };
};
