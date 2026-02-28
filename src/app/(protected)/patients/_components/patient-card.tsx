"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Mail, Phone, User } from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { patientsTable } from "@/db/schema";

import UpsertPatientForm from "./upsert-patient-form";

interface PatientCardProps {
  patient: typeof patientsTable.$inferSelect;
}

const PatientCard = ({ patient }: PatientCardProps) => {
  const [isUpsertPatientDialogOpen, setIsUpsertPatientDialogOpen] =
    useState(false);

  const patientInitials = patient.name
    .split(" ")
    .map((name) => name[0])
    .join("");

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const formatCpf = (cpf: string) => {
    const cleaned = cpf.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
    }
    return cpf;
  };

  const getSexLabel = (sex: "male" | "female") => {
    return sex === "male" ? "Masculino" : "Feminino";
  };

  // O Drizzle retorna a data como string, mas precisamos do formato dd/MM/yyyy para exibição no card
  const formattedDateOfBirth = format(
    new Date(patient.dateOfBirth),
    "dd/MM/yyyy",
    { locale: ptBR },
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Avatar className="h-10 w-10">
            <AvatarFallback>{patientInitials}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-sm font-medium">{patient.name}</h3>
            <p className="text-muted-foreground text-sm">
              CPF: {formatCpf(patient.cpf)}
            </p>
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="flex flex-col gap-2">
        <Badge variant="outline">
          <Mail className="mr-1 h-3 w-3" />
          {patient.email}
        </Badge>
        <Badge variant="outline">
          <Phone className="mr-1 h-3 w-3" />
          {formatPhoneNumber(patient.phoneNumber)}
        </Badge>
        <Badge variant="outline">
          <CalendarDays className="mr-1 h-3 w-3" />
          Nascimento: {formattedDateOfBirth}
        </Badge>
        <Badge variant="outline">
          <User className="mr-1 h-3 w-3" />
          {getSexLabel(patient.sex)}
        </Badge>
      </CardContent>
      <Separator />
      <CardFooter className="flex flex-col gap-2">
        <Dialog
          open={isUpsertPatientDialogOpen}
          onOpenChange={setIsUpsertPatientDialogOpen}
        >
          <DialogTrigger asChild>
            <Button className="w-full">Ver detalhes</Button>
          </DialogTrigger>
          <UpsertPatientForm
            // Passamos o patient.dateOfBirth como string para ser parseado no formulário
            patient={{
              ...patient,
              dateOfBirth: patient.dateOfBirth.toString(),
            }}
            onSuccess={() => setIsUpsertPatientDialogOpen(false)}
            isOpen={isUpsertPatientDialogOpen}
          />
        </Dialog>
      </CardFooter>
    </Card>
  );
};

export default PatientCard;
