// src/app/(protected)/doctors/_components/doctors-table-filters.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { dentalSpecialties, DentalSpecialty } from "../_constants";

// Array de todos os valores de especialidades para o Zod enum
const allDentalSpecialties = Object.values(DentalSpecialty) as [
  DentalSpecialty,
  ...DentalSpecialty[],
];

// Adiciona 'all' ao enum Zod ou usa refine para permitir 'all' ou o enum original
const filterSchema = z.object({
  specialty: z.enum(allDentalSpecialties).or(z.literal("all")).optional(), // Permite 'all'
});

export function DoctorsTableFilters({
  defaultSpecialty,
}: {
  defaultSpecialty?: DentalSpecialty;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm<z.infer<typeof filterSchema>>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      specialty: defaultSpecialty || "all", // Usa 'all' como default se nada for passado
    },
  });

  const { watch, handleSubmit } = form;
  const watchedSpecialty = watch("specialty");

  const isInitialMount = useRef(true);

  const onSubmit = (values: z.infer<typeof filterSchema>) => {
    const params = new URLSearchParams(searchParams);
    if (values.specialty && values.specialty !== "all") {
      // Verifica se não é 'all'
      params.set("specialty", values.specialty);
    } else {
      params.delete("specialty"); // Remove o filtro se for 'all' ou undefined
    }
    router.push(`?${params.toString()}`);
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    handleSubmit(onSubmit)();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedSpecialty, handleSubmit]);

  return (
    <Form {...form}>
      <form className="flex flex-col gap-4 md:flex-row md:items-end">
        <FormField
          control={form.control}
          name="specialty"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Especialidade</FormLabel>
              <Select
                onValueChange={
                  (value) => field.onChange(value === "all" ? undefined : value) // Converte 'all' para undefined no form state
                }
                value={field.value ?? "all"} // Usa 'all' se o valor for undefined/null
              >
                <FormControl>
                  <SelectTrigger className="w-full md:w-[250px]">
                    <SelectValue placeholder="Todas as especialidades" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {/* Item "Todos" com valor "all" */}
                  <SelectItem value="all">Todas as especialidades</SelectItem>
                  {dentalSpecialties.map((specialty) => (
                    <SelectItem key={specialty.value} value={specialty.value}>
                      {specialty.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
