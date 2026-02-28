"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2 } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  ODONTOGRAM_STATUS_MAP,
  TOOTH_FACES,
  ToothFace,
} from "@/app/(protected)/patients/[patientId]/odontogram/_constants";
import { OdontogramMark } from "@/app/(protected)/patients/[patientId]/odontogram/_types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { useOdontogram } from "./odontogram-context";

const statusOptions = Object.entries(ODONTOGRAM_STATUS_MAP).map(
  ([key, { label }]) => ({ value: key, label }),
);
const statusEnumValues = Object.keys(ODONTOGRAM_STATUS_MAP) as [
  string,
  ...string[],
];

const zToothMarkSchema = z.object({
  status: z.enum(statusEnumValues as any, {
    required_error: "O status é obrigatório.",
  }),
  observation: z.string().optional().nullable(),
});

type ToothMarkFormValues = z.infer<typeof zToothMarkSchema>;

const getFaceLabel = (value: ToothFace) =>
  TOOTH_FACES.find((f) => f.value === value)?.label || value;

export default function ToothModal() {
  const {
    odontogramState,
    setOdontogramState,
    selectedTooth,
    selectedFace,
    isModalOpen,
    closeModal,
    isSaving,
    saveOdontogram,
  } = useOdontogram();

  const existingMark =
    selectedTooth && selectedFace
      ? odontogramState[selectedTooth]?.marks[selectedFace]
      : undefined;

  const form = useForm<ToothMarkFormValues>({
    resolver: zodResolver(zToothMarkSchema),
    defaultValues: {
      status: (existingMark?.status as any) || "saudavel",
      observation: existingMark?.observation || "",
    },
  });

  React.useEffect(() => {
    if (isModalOpen) {
      form.reset({
        status: (existingMark?.status as any) || "saudavel",
        observation: existingMark?.observation || "",
      });
    }
  }, [isModalOpen, existingMark, form]);

  const onSubmit = async (values: ToothMarkFormValues) => {
    if (!selectedTooth || !selectedFace) return;

    const newMark: OdontogramMark = {
      id: existingMark?.id,
      toothNumber: selectedTooth,
      face: selectedFace,
      status: values.status as any,
      observation: values.observation || null,
    };

    setOdontogramState((prev) => {
      const newMarks = { ...prev[selectedTooth].marks };

      if (newMark.status === "saudavel") {
        if (newMarks[selectedFace]) {
          delete newMarks[selectedFace];
        }
      } else {
        newMarks[selectedFace] = newMark;
      }

      return {
        ...prev,
        [selectedTooth]: {
          ...prev[selectedTooth],
          marks: newMarks,
        },
      };
    });

    await saveOdontogram();
    closeModal();
  };

  if (!selectedTooth || !selectedFace) return null;

  return (
    <Dialog open={isModalOpen} onOpenChange={closeModal}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            Marcar Dente {selectedTooth} - {getFaceLabel(selectedFace)}
          </DialogTitle>
          <DialogDescription>
            Defina o status e adicione observações para esta face do dente.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status / Marcação</FormLabel>
                  <Select
                    onValueChange={field.onChange as any}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Status</SelectLabel>
                        {statusOptions.map(({ value, label }) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observação (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Pequena cárie no canto distal."
                      {...field}
                      value={field.value ?? ""}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || isSaving}
              >
                {form.formState.isSubmitting || isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Salvar Marcação
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
