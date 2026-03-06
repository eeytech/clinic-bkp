// src/app/(protected)/support-tickets/_components/table-columns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageSquare } from "lucide-react";
import Link from "next/link";

import { SupportTicketListItem } from "@/actions/support-tickets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";

const getStatusProps = (status: SupportTicketListItem["status"]) => {
  switch (status) {
    case "pending":
    case "aguardando":
    case "Aberto":
      return {
        label: "Aberto",
        color: "bg-yellow-100 text-yellow-800 border-yellow-300",
      };
    case "in_progress":
    case "em_atendimento":
    case "Em Atendimento":
      return {
        label: "Em Atendimento",
        color: "bg-blue-100 text-blue-800 border-blue-300",
      };
    case "resolved":
    case "concluido":
    case "Resolvido":
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

export const columns: ColumnDef<SupportTicketListItem>[] = [
  {
    accessorKey: "subject",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Assunto" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.original.subject}</span>
    ),
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
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Aberto em" />
    ),
    cell: ({ row }) =>
      format(new Date(row.original.createdAt), "dd/MM/yyyy HH:mm", {
        locale: ptBR,
      }),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/support-tickets/${row.original.id}`}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Ver Conversa
          </Link>
        </Button>
      </div>
    ),
  },
];
