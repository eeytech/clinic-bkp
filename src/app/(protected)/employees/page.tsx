// src/app/(protected)/employees/page.tsx
import { and, eq, SQL, sql } from "drizzle-orm"; // Importe 'and' e 'SQL'
import { Users } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  PageActions,
  PageContainer,
  PageContent,
  PageDescription,
  PageHeader,
  PageHeaderContent,
  PageTitle,
} from "@/components/ui/page-container";
import { db } from "@/db";
import { employeeRoleEnum, employeesTable } from "@/db/schema"; // Importe employeeRoleEnum
import { auth } from "@/lib/auth";

import AddEmployeeButton from "./_components/add-employee-button";
import EmployeeCard, { Employee } from "./_components/employee-card";
import { EmployeesTableFilters } from "./_components/employees-table-filters"; // Importe o novo componente de filtro
import { EmployeeRole } from "./_constants"; // Importe EmployeeRole

// Interface atualizada para aceitar role
interface EmployeesPageProps {
  searchParams: Promise<{
    role?: EmployeeRole;
  }>;
}

const EmployeesPage = async ({ searchParams }: EmployeesPageProps) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    redirect("/authentication");
  }
  if (!session.user.plan) {
    redirect("/new-subscription");
  }
  if (!session.user.clinic) {
    redirect("/clinic");
  }

  const resolvedSearchParams = await searchParams;
  const { role } = resolvedSearchParams;

  // Condições de busca
  const whereConditions: (SQL | undefined)[] = [
    eq(employeesTable.clinicId, session.user.clinic.id),
  ];

  // Adiciona filtro por cargo se fornecido
  if (role) {
    // Verifica se o cargo fornecido é válido
    if (employeeRoleEnum.enumValues.includes(role)) {
      // Usa `sql` para checar se o array 'role' contém o valor
      whereConditions.push(sql`${role} = ANY (${employeesTable.role})`);
    }
  }

  const employees = await db.query.employeesTable.findMany({
    where: and(...whereConditions), // Aplica as condições
  });

  // Adapta os dados, garantindo que dateOfBirth seja um Date
  const adaptedEmployees: Employee[] = employees.map((employee) => ({
    ...employee,
    // Garante que dateOfBirth seja um Date
    dateOfBirth: new Date(employee.dateOfBirth),
    // Garante que role seja um array (já é, mas por segurança)
    role: (employee.role as EmployeeRole[]) || [],
  })) as Employee[];

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Funcionários</PageTitle>
          <PageDescription>
            Gerencie os funcionários da sua clínica
          </PageDescription>
        </PageHeaderContent>
        <PageActions>
          <AddEmployeeButton />
        </PageActions>
      </PageHeader>
      <PageContent>
        {/* Adiciona o componente de filtro */}
        <EmployeesTableFilters defaultRole={role} />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {adaptedEmployees.map((employee) => (
            <EmployeeCard key={employee.id} employee={employee} />
          ))}
        </div>
        {/* Mensagem se nenhum funcionário for encontrado */}
        {adaptedEmployees.length === 0 && (
          <div className="flex h-40 items-center justify-center rounded-md border border-dashed">
            <p className="text-muted-foreground">
              Nenhum funcionário encontrado com os filtros aplicados.
            </p>
          </div>
        )}
      </PageContent>
    </PageContainer>
  );
};

export default EmployeesPage;
