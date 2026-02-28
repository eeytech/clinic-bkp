// src/app/api/financials/report/recipient/[recipientId]/route.ts
import "dayjs/locale/pt-br";

import { format } from "date-fns";
import dayjs from "dayjs";
import { and, desc, eq, gte, lte, SQL, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { z } from "zod";

import { db } from "@/db";
import {
  clinicFinancesTable,
  clinicsTable,
  doctorsTable, // Importar doctorsTable
  employeesTable, // Importar employeesTable
} from "@/db/schema";
import { formatCurrencyInCents } from "@/helpers/currency";
import { auth } from "@/lib/auth";

dayjs.locale("pt-br");

const paramsSchema = z.object({
  recipientId: z.string().uuid(), // ID do médico ou funcionário
});

interface RouteContext {
  params: Promise<{ recipientId: string }>; // Parâmetro da rota
}

export async function GET(
  request: NextRequest,
  { params: paramsPromise }: RouteContext,
) {
  try {
    const params = await paramsPromise;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.clinic?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = session.user.clinic.id;

    // Validar ID do recebedor
    const validationResult = paramsSchema.safeParse(params);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid recipient ID" },
        { status: 400 },
      );
    }
    const recipientId = validationResult.data.recipientId;

    // Buscar informações do recebedor (médico ou funcionário)
    const recipient =
      (await db.query.doctorsTable.findFirst({
        where: and(
          eq(doctorsTable.id, recipientId),
          eq(doctorsTable.clinicId, clinicId),
        ),
        columns: { name: true },
      })) ||
      (await db.query.employeesTable.findFirst({
        where: and(
          eq(employeesTable.id, recipientId),
          eq(employeesTable.clinicId, clinicId),
        ),
        columns: { name: true },
      }));

    if (!recipient) {
      return NextResponse.json(
        { error: "Recipient not found" },
        { status: 404 },
      );
    }
    const recipientName = recipient.name;

    // Pegar filtros de data da URL
    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // --- Fetch Clinic Info ---
    const clinicInfo = await db.query.clinicsTable.findFirst({
      where: eq(clinicsTable.id, clinicId),
      columns: { name: true, cnpj: true },
    });

    // --- Build Query ---
    const conditions: (SQL | undefined)[] = [
      eq(clinicFinancesTable.clinicId, clinicId),
      eq(clinicFinancesTable.employeeId, recipientId), // Filtra pelo ID do recebedor
      eq(clinicFinancesTable.operation, "output"), // Apenas pagamentos
      eq(clinicFinancesTable.status, "paid"), // Apenas pagos
    ];

    if (from)
      conditions.push(
        gte(
          clinicFinancesTable.paymentDate,
          dayjs(from).startOf("day").toDate(),
        ),
      );
    if (to)
      conditions.push(
        lte(clinicFinancesTable.paymentDate, dayjs(to).endOf("day").toDate()),
      );

    const payments = await db.query.clinicFinancesTable.findMany({
      where: and(...conditions),
      orderBy: desc(clinicFinancesTable.paymentDate),
      // Não precisamos de 'with' aqui
    });

    // --- Generate HTML ---
    const generateTableRows = () =>
      payments
        .map(
          (p) => `
        <tr>
            <td>${p.id}</td>
            <td>${p.description}</td>
            <td>${p.paymentDate ? format(new Date(p.paymentDate), "dd/MM/yyyy") : "-"}</td>
            <td>${p.paymentMethod || "-"}</td>
            <td>${formatCurrencyInCents(p.amountInCents)}</td>
        </tr>`,
        )
        .join("");

    const totalAmount = payments.reduce((sum, p) => sum + p.amountInCents, 0);

    const htmlContent = `
        <html>
            <head><title>Relatório de Pagamentos - ${recipientName}</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; font-size: 10px; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .recipient-info { text-align: center; margin-bottom: 15px; font-size: 11px; font-weight: bold; }
                    .filter-info { margin-bottom: 15px; font-size: 9px; color: #555; }
                    table { border-collapse: collapse; width: 100%; margin-bottom: 20px;}
                    th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .total { font-weight: bold; margin-top: 10px; text-align: right;}
                    .footer { margin-top: 30px; text-align: center; font-size: 9px; color: #777; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Relatório de Pagamentos Recebidos</h1>
                     ${clinicInfo?.name ? `<h2>${clinicInfo.name}${clinicInfo.cnpj ? ` - ${clinicInfo.cnpj}` : ""}</h2>` : ""}
                </div>
                <div class="recipient-info">
                    <p>Recebedor: ${recipientName}</p>
                </div>
                 <div class="filter-info">
                    <p>Período: ${from ? dayjs(from).format("DD/MM/YYYY") : "Início"} até ${to ? dayjs(to).format("DD/MM/YYYY") : "Fim"}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Descrição</th>
                            <th>Data Pag.</th>
                            <th>Forma Pag.</th>
                            <th>Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${generateTableRows()}
                    </tbody>
                </table>
                <div class="total">
                    Total Recebido no Período: ${formatCurrencyInCents(totalAmount)}
                </div>
                <div class="footer">Gerado em: ${dayjs().format("DD/MM/YYYY HH:mm:ss")}</div>
            </body>
        </html>
    `;

    // --- Generate PDF ---
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" },
    });
    await browser.close();

    // --- Return PDF ---
    return new NextResponse(pdfBuffer.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="relatorio_pagamentos_${recipientName.replace(/\s+/g, "_")}_${dayjs().format("YYYYMMDD")}.pdf"`,
      },
    });
  } catch (error) {
    console.error("GET Recipient Payment Report Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
