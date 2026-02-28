// src/app/(protected)/dashboard/_components/appointments-chart.tsx
"use client";

import "dayjs/locale/pt-br";

import dayjs from "dayjs";

dayjs.locale("pt-br");
import { Calendar } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface DailyAppointment {
  date: string; // Formato YYYY-MM-DD
  appointments: number;
}

interface AppointmentsChartProps {
  dailyAppointmentsData: DailyAppointment[];
}

const AppointmentsChart = ({
  dailyAppointmentsData,
}: AppointmentsChartProps) => {
  // Gerar 21 dias: 10 antes + hoje + 10 depois
  const chartDays = Array.from({ length: 21 }).map((_, i) =>
    dayjs()
      .subtract(10 - i, "days")
      .format("YYYY-MM-DD"),
  );

  const chartData = chartDays.map((date) => {
    const dataForDay = dailyAppointmentsData.find((item) => item.date === date);
    return {
      date: dayjs(date).format("DD/MM"), // Label para o eixo X
      fullDate: date, // Data completa para o tooltip
      appointments: dataForDay?.appointments || 0,
    };
  });

  const chartConfig = {
    appointments: {
      label: "Agendamentos",
      color: "#0B68F7", // Cor primária (azul)
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Calendar className="text-muted-foreground" /> {/* Ícone ajustado */}
        <CardTitle className="text-base">Agendamentos</CardTitle>{" "}
        {/* Título ajustado */}
      </CardHeader>
      <CardContent>
        {/* ChartContainer lida com a responsividade. O conteúdo direto deve ser um único elemento ReactElement */}
        <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
          {/* O AreaChart é o único filho direto do ChartContainer */}
          <AreaChart
            data={chartData}
            margin={{
              top: 10,
              right: 10, // Margens ajustadas para melhor visualização
              left: -20, // Margem negativa para aproximar o eixo Y
              bottom: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />{" "}
            {/* Linhas horizontais */}
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              allowDecimals={false} // Garante números inteiros no eixo Y
            />
            <ChartTooltip
              cursor={false} // Desabilita o cursor vertical no hover
              content={
                <ChartTooltipContent
                  indicator="dot" // Usa ponto como indicador
                  formatter={(value) => [`${value} Agendamento(s)`, null]} // Formata o valor
                  labelFormatter={(label, payload) => {
                    // Formata a data no tooltip
                    if (payload && payload[0]) {
                      return dayjs(payload[0].payload?.fullDate).format(
                        "DD/MM/YYYY (dddd)",
                      );
                    }
                    return label;
                  }}
                />
              }
            />
            <defs>
              {/* Gradiente para a área */}
              <linearGradient id="fillAppointments" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-appointments)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-appointments)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <Area
              dataKey="appointments"
              type="natural" // Curva mais suave
              fill="url(#fillAppointments)" // Usa o gradiente
              fillOpacity={1} // Opacidade controlada pelo gradiente
              stroke="var(--color-appointments)"
              strokeWidth={2}
              stackId="a" // Permite empilhar áreas se houver mais de uma
              dot={false} // Esconde os pontos na linha
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default AppointmentsChart;
