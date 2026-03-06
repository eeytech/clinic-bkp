// src/app/(protected)/support-tickets/_components/support-tickets-table.tsx
"use client";

import React from "react";
import { SupportTicketListItem } from "@/actions/support-tickets";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./table-columns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SupportTicketsTableProps {
  data: SupportTicketListItem[];
}

export default function SupportTicketsTable({
  data,
}: SupportTicketsTableProps) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Histórico de Chamados</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={data} />
      </CardContent>
    </Card>
  );
}
