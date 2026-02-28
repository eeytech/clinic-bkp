// src/app/(protected)/employees/_components/employees-table-filters.tsx
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

import { EmployeeRole, employeeRoles } from "../_constants"; // Importa do diretório de funcionários

// Array de todos os valores de cargos para o Zod enum
const allEmployeeRoles = Object.values(EmployeeRole) as [
  EmployeeRole,
  ...EmployeeRole[],
];

// Adiciona 'all' ao enum Zod ou usa refine
const filterSchema = z.object({
  role: z.enum(allEmployeeRoles).or(z.literal("all")).optional(), // Permite 'all'
});

export function EmployeesTableFilters({
  defaultRole,
}: {
  defaultRole?: EmployeeRole;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm<z.infer<typeof filterSchema>>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      role: defaultRole || "all", // Usa 'all' como default
    },
  });

  const { watch, handleSubmit } = form;
  const watchedRole = watch("role");

  const isInitialMount = useRef(true);

  const onSubmit = (values: z.infer<typeof filterSchema>) => {
    const params = new URLSearchParams(searchParams);
    if (values.role && values.role !== "all") {
      // Verifica se não é 'all'
      params.set("role", values.role);
    } else {
      params.delete("role"); // Remove o filtro se for 'all' ou undefined
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
  }, [watchedRole, handleSubmit]);

  return (
    <Form {...form}>
      <form className="flex flex-col gap-4 md:flex-row md:items-end">
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cargo</FormLabel>
              <Select
                onValueChange={
                  (value) => field.onChange(value === "all" ? undefined : value) // Converte 'all' para undefined
                }
                value={field.value ?? "all"} // Usa 'all' se o valor for undefined/null
              >
                <FormControl>
                  <SelectTrigger className="w-full md:w-[250px]">
                    <SelectValue placeholder="Todos os cargos" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {/* Item "Todos" com valor "all" */}
                  <SelectItem value="all">Todos os cargos</SelectItem>
                  {employeeRoles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
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
