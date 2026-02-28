// src/app/(protected)/financials/_constants/index.ts
import {
  clinicFinancialOperationEnum,
  clinicFinancialStatusEnum,
  clinicFinancialTypeInputEnum,
  clinicFinancialTypeOutputEnum,
  clinicPaymentMethodsEnum,
} from "@/db/schema";

export const clinicFinancialOperations =
  clinicFinancialOperationEnum.enumValues.map((value) => ({
    value,
    label: value === "input" ? "Entrada" : "Saída",
  }));

export const clinicFinancialTypesInput =
  clinicFinancialTypeInputEnum.enumValues.map((value) => ({
    value,
    label: value,
  }));

export const clinicFinancialTypesOutput =
  clinicFinancialTypeOutputEnum.enumValues.map((value) => ({
    value,
    label: value,
  }));

export const clinicFinancialStatuses = clinicFinancialStatusEnum.enumValues.map(
  (value) => ({
    value,
    label:
      {
        pending: "Pendente",
        paid: "Pago",
        overdue: "Vencido",
        refunded: "Estornado",
      }[value] || value, // Map to labels
  }),
);

export const clinicPaymentMethods = clinicPaymentMethodsEnum.enumValues.map(
  (value) => ({
    value,
    label: value,
  }),
);

// Exporting types for convenience
export type ClinicFinancialOperation =
  (typeof clinicFinancialOperationEnum.enumValues)[number];
export type ClinicFinancialTypeInput =
  (typeof clinicFinancialTypeInputEnum.enumValues)[number];
export type ClinicFinancialTypeOutput =
  (typeof clinicFinancialTypeOutputEnum.enumValues)[number];
export type ClinicFinancialStatus =
  (typeof clinicFinancialStatusEnum.enumValues)[number];
export type ClinicPaymentMethod =
  (typeof clinicPaymentMethodsEnum.enumValues)[number];
