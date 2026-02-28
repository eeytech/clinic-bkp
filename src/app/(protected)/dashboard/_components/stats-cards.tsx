// src/app/(protected)/dashboard/_components/stats-cards.tsx

import { CalendarIcon, Stethoscope, UserIcon, UsersIcon } from "lucide-react"; // Adicionado Stethoscope para médicos e UsersIcon para funcionários

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsCardsProps {
  totalAppointments: number;
  totalPatients: number;
  totalDoctors: number;
  totalEmployees: number; // Adicionado
}

const StatsCards = ({
  totalAppointments,
  totalPatients,
  totalDoctors,
  totalEmployees, // Adicionado
}: StatsCardsProps) => {
  const stats = [
    {
      title: "Agendamentos (Período)", // Indicando que é filtrado
      value: totalAppointments.toString(),
      icon: CalendarIcon,
    },
    {
      title: "Pacientes (Total)", // Indicando que é total
      value: totalPatients.toString(),
      icon: UserIcon,
    },
    {
      title: "Médicos (Total)", // Indicando que é total
      value: totalDoctors.toString(),
      icon: Stethoscope, // Ícone alterado
    },
    {
      title: "Funcionários (Total)", // NOVO CARD
      value: totalEmployees.toString(),
      icon: UsersIcon, // Ícone para funcionários
    },
  ];

  return (
    // Ajustado grid para 4 colunas em telas maiores
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            {/* Layout interno ajustado */}
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className="text-muted-foreground h-5 w-5" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default StatsCards;
