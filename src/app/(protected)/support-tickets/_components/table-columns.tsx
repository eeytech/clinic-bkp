// src/app/(protected)/support-tickets/_components/table-columns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
// Importa o helper para cabeçalhos ordenáveis
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { supportTicketsTable, usersTable } from "@/db/schema";
import { cn } from "@/lib/utils";

export type SupportTicketWithUser = typeof supportTicketsTable.$inferSelect & {
  user: Pick<typeof usersTable.$inferSelect, "name" | "email"> | null;
};

// Helper para mapear status (sem alterações)
const getStatusProps = (status: SupportTicketWithUser["status"]) => {
  switch (status) {
    case "pending":
      return {
        label: "Pendente",
        color: "bg-yellow-100 text-yellow-800 border-yellow-300",
      };
    case "in_progress":
      return {
        label: "Em Andamento",
        color: "bg-blue-100 text-blue-800 border-blue-300",
      };
    case "resolved":
      return {
        label: "Resolvido",
        color: "bg-green-100 text-green-800 border-green-300",
      };
    default:
      return {
        label: status,
        color: "bg-gray-100 text-gray-800 border-gray-300",
      };
  }
};

// Definição das colunas com cabeçalhos ordenáveis
export const columns: ColumnDef<SupportTicketWithUser>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => <DataTableColumnHeader column={column} title="#" />,
    cell: ({ row }) => row.original.id,
    enableSorting: true,
  },
  {
    accessorKey: "subject",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Assunto" />
    ),
    cell: ({ row }) => row.original.subject,
    enableSorting: true,
  },
  {
    accessorKey: "description",
    header: "Descrição", // Geralmente não ordenável
    cell: ({ row }) => (
      <p className="max-w-xs truncate">{row.original.description}</p>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const { label, color } = getStatusProps(row.original.status);
      return (
        <Badge variant="outline" className={cn(color)}>
          {label}
        </Badge>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: "user.name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Aberto por" />
    ),
    cell: ({ row }) =>
      row.original.user?.name ?? row.original.user?.email ?? "-",
    enableSorting: true,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data Abertura" />
    ),
    cell: ({ row }) =>
      format(new Date(row.original.createdAt), "dd/MM/yyyy HH:mm", {
        locale: ptBR,
      }),
    enableSorting: true,
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Última Atualização" />
    ),
    cell: ({ row }) => {
      const updatedAt = row.original.updatedAt;
      return updatedAt
        ? format(new Date(updatedAt), "dd/MM/yyyy HH:mm", {
            locale: ptBR,
          })
        : "-";
    },
    enableSorting: true,
  },
  // { // Coluna de Ações (pode ser adicionada futuramente)
  //   id: "actions",
  //   header: "Ações",
  //   cell: ({ row }) => {
  //     // Aqui você pode adicionar botões para ver detalhes, mudar status, etc.
  //     return <div>...</div>;
  //   },
  //   enableSorting: false,
  // },
];
