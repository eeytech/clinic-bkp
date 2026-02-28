// src/app/(protected)/employees/_constants/index.ts
export enum EmployeeRole {
  RECEPCIONISTA = "Recepcionista",
  ASB = "Auxiliar de Saúde Bucal",
  TSB = "Técnico em Saúde Bucal",
  ADMINISTRATIVO = "Administrativo",
  GERENTE = "Gerente",
}

export const employeeRoles = Object.entries(EmployeeRole).map(
  ([key, value]) => ({
    value: EmployeeRole[key as keyof typeof EmployeeRole],
    label: value,
  }),
);

// Reutilizando os estados brasileiros do doctors
export { BrazilianState, brazilianStates } from "../../doctors/_constants";
