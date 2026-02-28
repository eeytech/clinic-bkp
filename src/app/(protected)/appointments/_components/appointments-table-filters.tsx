"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { DateRange } from "react-day-picker";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { appointmentStatusEnum } from "@/db/schema";
import { cn } from "@/lib/utils";

// Schema atualizado para usar dateRange com from e to
const filterSchema = z.object({
  status: z.enum(appointmentStatusEnum.enumValues).optional(),
  dateRange: z
    .object({
      from: z.date().optional(),
      to: z.date().optional(),
    })
    .optional(),
  filterByDate: z.boolean().optional(), // Mantém o checkbox
});

export function AppointmentsTableFilters({
  defaultStatus,
  defaultDateRange, // Renomeado para defaultDateRange
}: {
  defaultStatus?: (typeof appointmentStatusEnum.enumValues)[number];
  defaultDateRange?: { from?: Date; to?: Date }; // Tipo atualizado
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Verifica se 'from' existe nos searchParams para definir o valor inicial do checkbox
  const initialFilterByDate = searchParams.has("from");

  const form = useForm<z.infer<typeof filterSchema>>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      status: defaultStatus || "agendada",
      // Define o range inicial ou um default (hoje até daqui 7 dias)
      dateRange: {
        from: defaultDateRange?.from ?? new Date(),
        to: defaultDateRange?.to ?? addDays(new Date(), 7),
      },
      filterByDate: initialFilterByDate, // Define com base nos searchParams
    },
  });

  const { watch, handleSubmit } = form;
  const watchedStatus = watch("status");
  const watchedDateRange = watch("dateRange");
  const watchedFilterByDate = watch("filterByDate"); // Observa o checkbox

  const isInitialMount = useRef(true);

  const onSubmit = (values: z.infer<typeof filterSchema>) => {
    const params = new URLSearchParams(searchParams); // Preserva outros parâmetros
    if (values.status) {
      params.set("status", values.status);
    } else {
      params.delete("status");
    }

    // Adiciona from e to apenas se filterByDate for true
    if (values.filterByDate && values.dateRange?.from) {
      params.set("from", format(values.dateRange.from, "yyyy-MM-dd"));
      if (values.dateRange.to) {
        params.set("to", format(values.dateRange.to, "yyyy-MM-dd"));
      } else {
        // Se 'to' não estiver definido, remove o parâmetro 'to'
        params.delete("to");
      }
    } else {
      // Remove os parâmetros de data se filterByDate for false
      params.delete("from");
      params.delete("to");
    }
    router.push(`?${params.toString()}`);
  };

  // useEffect atualizado para observar dateRange e filterByDate
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    handleSubmit(onSubmit)();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedStatus, watchedDateRange, watchedFilterByDate, handleSubmit]);

  return (
    <Form {...form}>
      <form className="flex flex-col gap-4 md:flex-row md:items-end">
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {appointmentStatusEnum.enumValues.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() +
                        status.slice(1).replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        {/* Checkbox para habilitar/desabilitar filtro de data */}
        <FormField
          control={form.control}
          name="filterByDate"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-2 pb-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel>Filtrar por data</FormLabel>
            </FormItem>
          )}
        />

        {/* DatePicker atualizado para range */}
        <FormField
          control={form.control}
          name="dateRange"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              {/* <FormLabel>Período</FormLabel> */} {/* Label opcional */}
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      id="date"
                      variant={"outline"}
                      // Desabilita se o checkbox não estiver marcado
                      disabled={!watchedFilterByDate}
                      className={cn(
                        "w-full justify-start text-left font-normal md:w-[300px]",
                        !field.value?.from && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value?.from ? (
                        field.value.to ? (
                          <>
                            {format(field.value.from, "dd/MM/y", {
                              locale: ptBR,
                            })}{" "}
                            -{" "}
                            {format(field.value.to, "dd/MM/y", {
                              locale: ptBR,
                            })}
                          </>
                        ) : (
                          format(field.value.from, "dd/MM/y")
                        )
                      ) : (
                        <span>Selecione o período</span>
                      )}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range" // Modo range
                    defaultMonth={field.value?.from}
                    selected={field.value as DateRange} // Casting para DateRange
                    onSelect={field.onChange}
                    numberOfMonths={2} // Exibe 2 meses como no dashboard
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
