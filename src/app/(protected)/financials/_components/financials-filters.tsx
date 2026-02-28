// src/app/(protected)/financials/_components/financials-filters.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import dayjs from "dayjs";
import { CalendarIcon } from "lucide-react";
// Remove parseAsString import if not used elsewhere, keep parseAsIsoDate
import { parseAsIsoDate, useQueryState } from "nuqs";
import React, { useEffect } from "react";
import { DateRange } from "react-day-picker";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import {
  clinicFinancialOperationEnum,
  clinicFinancialStatusEnum,
} from "@/db/schema";
import { cn } from "@/lib/utils";

import {
  ClinicFinancialOperation,
  clinicFinancialOperations,
  ClinicFinancialStatus,
  clinicFinancialStatuses,
} from "../index";

// Schema for form (optional fields)
const filterSchema = z.object({
  status: z.enum(clinicFinancialStatusEnum.enumValues).optional().nullable(),
  operation: z
    .enum(clinicFinancialOperationEnum.enumValues)
    .optional()
    .nullable(),
});

type FilterFormValues = z.infer<typeof filterSchema>;

export function FinancialsFilters() {
  // Use nuqs for URL state management
  // --- CORRECTION: Remove .withDefault(null) and handle null explicitly ---
  const [status, setStatus] = useQueryState("status", {
    history: "replace",
    // Use shallow: false if navigation needs to trigger server actions/data refetch
    // shallow: false
  });
  const [operation, setOperation] = useQueryState("operation", {
    history: "replace",
    // shallow: false
  });
  // --- END CORRECTION ---

  const [from, setFrom] = useQueryState(
    "from",
    parseAsIsoDate
      .withDefault(dayjs().startOf("month").toDate())
      .withOptions({ history: "replace" }),
  );
  const [to, setTo] = useQueryState(
    "to",
    parseAsIsoDate
      .withDefault(dayjs().endOf("month").toDate())
      .withOptions({ history: "replace" }),
  );

  const form = useForm<FilterFormValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      // Initialize form ensuring null is treated as undefined for the form state if needed
      status: (status as ClinicFinancialStatus) ?? undefined,
      operation: (operation as ClinicFinancialOperation) ?? undefined,
    },
  });

  // Update URL when form values change
  const watchedStatus = form.watch("status");
  const watchedOperation = form.watch("operation");

  useEffect(() => {
    // Only update if the form value differs from the URL state
    // Allow setting back to null explicitly
    const newStatus = watchedStatus || null;
    const newOperation = watchedOperation || null;

    if (newStatus !== status) {
      setStatus(newStatus);
    }
    if (newOperation !== operation) {
      setOperation(newOperation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedStatus, watchedOperation]);

  // Update form when URL changes (e.g., back button)
  useEffect(() => {
    form.reset({
      // Ensure null from URL becomes undefined for the form if needed, or handle null directly
      status: (status as ClinicFinancialStatus) ?? undefined,
      operation: (operation as ClinicFinancialOperation) ?? undefined,
    });
  }, [status, operation, form]);

  // Date Range Picker state and handler
  const dateRange = React.useMemo(() => ({ from, to }), [from, to]);
  const handleDateSelect = (range: DateRange | undefined) => {
    setFrom(range?.from ?? null);
    setTo(range?.to ?? null);
  };

  const handleClearFilters = () => {
    form.reset({ status: undefined, operation: undefined });
    setStatus(null); // Explicitly set URL state to null
    setOperation(null); // Explicitly set URL state to null
    setFrom(dayjs().startOf("month").toDate()); // Reset date to default
    setTo(dayjs().endOf("month").toDate());
  };

  return (
    <Form {...form}>
      {/* Added md:items-end for better alignment on medium screens */}
      <form className="mb-6 flex flex-col items-start gap-4 md:flex-row md:flex-wrap md:items-end">
        {/* Date Range Picker */}
        <div className="flex flex-col gap-2">
          <FormLabel>Período</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal md:w-[260px]", // Adjusted width
                  !dateRange?.from && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd/MM/yy", { locale: ptBR })} -{" "}
                      {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}
                    </>
                  ) : (
                    format(dateRange.from, "dd/MM/yy", { locale: ptBR })
                  )
                ) : (
                  <span>Selecione o período</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange as DateRange}
                onSelect={handleDateSelect}
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Status Filter */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select
                // Update form state: map 'all' to null/undefined
                onValueChange={(value) =>
                  field.onChange(value === "all" ? null : value)
                }
                // Read form state: map null/undefined to 'all' for display
                value={field.value ?? "all"}
              >
                <FormControl>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Todos os Status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {clinicFinancialStatuses.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        {/* Operation Filter */}
        <FormField
          control={form.control}
          name="operation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Operação</FormLabel>
              <Select
                // Update form state: map 'all' to null/undefined
                onValueChange={(value) =>
                  field.onChange(value === "all" ? null : value)
                }
                // Read form state: map null/undefined to 'all' for display
                value={field.value ?? "all"}
              >
                <FormControl>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Todas as Operações" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="all">Todas as Operações</SelectItem>
                  {clinicFinancialOperations.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        {/* Clear Button */}
        <Button
          type="button"
          variant="ghost"
          onClick={handleClearFilters}
          className="self-end"
        >
          {" "}
          {/* Use self-end */}
          Limpar Filtros
        </Button>
      </form>
    </Form>
  );
}
