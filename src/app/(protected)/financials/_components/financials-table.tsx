// src/app/(protected)/financials/_components/financials-table.tsx
"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"; // Import useReactTable and related types
import React from "react"; // Import React

import { DataTable } from "@/components/ui/data-table"; // Keep DataTable import
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Import Table components

// Importar o tipo corrigido e as colunas
import { columns, FinancialTransaction } from "./table-columns";

interface FinancialsTableProps {
  data: FinancialTransaction[];
  // Adicionar props para passar para as actions via meta
  patients: { id: string; name: string }[];
  employeesAndDoctors: { id: string; name: string }[];
}

export default function FinancialsTable({
  data,
  patients,
  employeesAndDoctors,
}: FinancialsTableProps) {
  // Passar patients e employeesAndDoctors via meta
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: {
      patients,
      employeesAndDoctors,
    },
  });

  // Reimplementar a renderização da tabela aqui, similar ao DataTable,
  // mas usando o 'table' instance criado com 'meta'
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                Nenhum resultado encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
