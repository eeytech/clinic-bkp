// src/app/(protected)/dashboard/_components/top-employees.tsx
import { Users } from "lucide-react"; // Ícone para funcionários

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Usando AvatarImage
import { Card, CardContent, CardTitle } from "@/components/ui/card";

// Interface adaptada para funcionários
interface TopEmployeesProps {
  employees: {
    id: string;
    name: string;
    avatarImageUrl: string | null;
    role: string; // Ou o tipo correto se for um enum/array
    // Adicionar outras métricas se aplicável, ex: tasksCompleted: number;
  }[];
}

export default function TopEmployees({ employees }: TopEmployeesProps) {
  return (
    <Card className="mx-auto w-full">
      <CardContent>
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="text-muted-foreground" />
            <CardTitle className="text-base">Funcionários</CardTitle>
          </div>
          {/* Pode adicionar um link "Ver todos" se houver uma página de funcionários */}
        </div>

        {/* Lista de Funcionários */}
        <div className="space-y-6">
          {employees.map((employee) => (
            <div
              key={employee.id}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <Avatar className="h-10 w-10">
                  {/* Adicionado AvatarImage */}
                  <AvatarImage
                    src={employee.avatarImageUrl || ""}
                    alt={employee.name}
                  />
                  <AvatarFallback className="bg-gray-100 text-lg font-medium text-gray-600">
                    {employee.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-sm">{employee.name}</h3>
                  <p className="text-muted-foreground text-sm">
                    {employee.role}{" "}
                    {/* Exibe o cargo principal ou o primeiro cargo */}
                  </p>
                </div>
              </div>
              {/* Remover a contagem de agendamentos se não for aplicável */}
              {/* <div className="text-right">
                <span className="text-muted-foreground text-sm font-medium">
                  {employee.metricValue} métrica
                </span>
              </div> */}
            </div>
          ))}
          {employees.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Nenhum funcionário encontrado.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
