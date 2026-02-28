// src/app/(protected)/patients/_components/table-columns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Badge } from "@/components/ui/badge"; // Import Badge
// Importa o helper para cabeçalhos ordenáveis
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { patientsTable } from "@/db/schema";
import { cn } from "@/lib/utils"; // Import cn

import PatientsTableActions from "./table-actions";

type Patient = typeof patientsTable.$inferSelect;

export const patientsTableColumns: ColumnDef<Patient>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome" />
    ),
    cell: ({ row }) => row.original.name,
    enableSorting: true,
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
    cell: ({ row }) => row.original.email || "-", // Mostrar '-' se for nulo
    enableSorting: true,
  },
  {
    accessorKey: "phoneNumber",
    header: "Telefone",
    cell: ({ row }) => {
      const patient = row.original;
      const phoneNumber = patient.phoneNumber;
      if (!phoneNumber) return "-";
      // Formata (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
      const cleaned = phoneNumber.replace(/\D/g, "");
      if (cleaned.length === 11) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
      }
      if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
      }
      return phoneNumber;
    },
    enableSorting: false,
  },
  {
    accessorKey: "cpf",
    header: "CPF",
    cell: ({ row }) => {
      const patient = row.original;
      const cpf = patient.cpf;
      if (!cpf) return "-";
      // Formata ###.###.###-##
      const cleaned = cpf.replace(/\D/g, "");
      if (cleaned.length === 11) {
        return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
      }
      return cpf;
    },
    enableSorting: false,
  },
  {
    accessorKey: "cadastralStatus", // Renomeado para cadastralStatus
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status Cadastro" /> // Título alterado
    ),
    cell: ({ row }) => {
      const status = row.original.cadastralStatus;
      const isActive = status === "active";
      return (
        <Badge
          variant={isActive ? "default" : "secondary"}
          className={cn(isActive && "bg-green-500 hover:bg-green-600")}
        >
          {isActive ? "Ativo" : "Inativo"}
        </Badge>
      );
    },
    enableSorting: true,
    filterFn: (row, id, value) => {
      // Adicionado filtro básico
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "financialStatus",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status Financeiro" />
    ),
    cell: ({ row }) => {
      const status = row.original.financialStatus;
      const isAdimplente = status === "adimplente";
      return (
        <Badge
          variant={isAdimplente ? "default" : "destructive"}
          className={cn(isAdimplente && "bg-green-500 hover:bg-green-600")}
        >
          {isAdimplente ? "Adimplente" : "Inadimplente"}
        </Badge>
      );
    },
    enableSorting: true,
    filterFn: (row, id, value) => {
      // Adicionado filtro básico
      return value.includes(row.getValue(id));
    },
  },
  {
    id: "actions",
    header: "Ações",
    cell: ({ row }) => {
      const patient = row.original;
      return <PatientsTableActions patient={patient} />;
    },
    enableSorting: false,
  },
];
