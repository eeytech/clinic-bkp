import { z } from "zod";

// Definição local dos enums (para evitar importação circular)
const appointmentStatus = z.enum(["agendada", "atendida", "cancelada"], {
  required_error: "Status é obrigatório.",
});
const dentalProcedure = z.enum(
  [
    "Avaliação Inicial",
    "Limpeza (Profilaxia)",
    "Restauração",
    "Extração",
    "Tratamento de Canal (Endodontia)",
    "Clareamento Dental",
    "Implante Dentário",
    "Consulta de Retorno",
  ],
  {
    required_error: "Procedimento é obrigatório.",
  },
);

export const addAppointmentSchema = z.object({
  patientId: z.string().min(1, {
    message: "Paciente é obrigatório.",
  }),
  doctorId: z.string().min(1, {
    message: "Médico é obrigatório.",
  }),
  date: z.date({
    message: "Data é obrigatória.",
  }),
  time: z.string().min(1, {
    message: "Horário é obrigatório.",
  }),
  status: appointmentStatus,
  procedure: dentalProcedure,
});
