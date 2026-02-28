// src/app/(protected)/support-tickets/_components/support-tickets-table.tsx
"use client";

import React from "react";

import { DataTable } from "@/components/ui/data-table";

import { columns, SupportTicketWithUser } from "./table-columns"; // Importa as colunas

interface SupportTicketsTableProps {
  data: SupportTicketWithUser[];
}

export default function SupportTicketsTable({
  data,
}: SupportTicketsTableProps) {
  return (
    <div className="mt-6">
      <h2 className="mb-4 text-xl font-semibold">Meus Chamados</h2>
      <DataTable columns={columns} data={data} />
    </div>
  );
}
