// src/app/(protected)/financials/_components/add-finance-entry-button.tsx
"use client";

import { Plus } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";

import UpsertFinanceForm from "./upsert-finance-form";

// Define a interface para as props do botão
interface AddFinanceEntryButtonProps {
  patients: { id: string; name: string }[];
  employeesAndDoctors: { id: string; name: string }[];
}

// Recebe as props patients e employeesAndDoctors
export default function AddFinanceEntryButton({
  patients,
  employeesAndDoctors,
}: AddFinanceEntryButtonProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Transação
        </Button>
      </DialogTrigger>
      {/* Passa as props recebidas para o UpsertFinanceForm */}
      <UpsertFinanceForm
        onSuccess={() => setIsOpen(false)}
        patients={patients}
        employeesAndDoctors={employeesAndDoctors}
      />
    </Dialog>
  );
}
