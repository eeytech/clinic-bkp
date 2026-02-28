// src/app/(protected)/employees/_components/add-employee-button.tsx
"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";

import UpsertEmployeeForm from "./upsert-employee-form"; // Importa o novo formulário

const AddEmployeeButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Adicionar funcionário
        </Button>
      </DialogTrigger>
      {/* Usa o novo formulário */}
      <UpsertEmployeeForm onSuccess={() => setIsOpen(false)} isOpen={isOpen} />
    </Dialog>
  );
};

export default AddEmployeeButton;
