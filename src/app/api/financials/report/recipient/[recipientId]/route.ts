import "dayjs/locale/pt-br";

import { format } from "date-fns";
import dayjs from "dayjs";
import { and, desc, eq, gte, lte, SQL } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { z } from "zod";

import { db } from "@/db";
import {
  clinicFinancesTable,
  clinicsTable,
  doctorsTable,
  employeesTable,
} from "@/db/schema";
import { formatCurrencyInCents } from "@/helpers/currency";
import { getAuthorizedClinicContextForApi } from "@/lib/auth/clinic-context";

dayjs.locale("pt-br");

const paramsSchema = z.object({
  recipientId: z.string().uuid(),
});

interface RouteContext {
  params: Promise<{ recipientId: string }>;
}

export async function GET(request: NextRequest, { params: paramsPromise }: RouteContext) {
  try {
    const context = await getAuthorizedClinicContextForApi();
    if (!context.ok) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }

    const { clinicId, applicationId } = context;
    const params = await paramsPromise;

    const validationResult = paramsSchema.safeParse(params);
    if (!validationResult.success) {
      return NextResponse.json({ error: "Invalid recipient ID" }, { status: 400 });
    }

    const recipientId = validationResult.data.recipientId;

    const recipient =
      (await db.query.doctorsTable.findFirst({
        where: and(eq(doctorsTable.id, recipientId), eq(doctorsTable.clinicId, clinicId)),
        columns: { name: true },
      })) ||
      (await db.query.employeesTable.findFirst({
        where: and(eq(employeesTable.id, recipientId), eq(employeesTable.clinicId, clinicId)),
        columns: { name: true },
      }));

    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const clinicInfo = await db.query.clinicsTable.findFirst({
      where: and(
        eq(clinicsTable.id, clinicId),
        eq(clinicsTable.applicationId, applicationId),
      ),
      columns: { name: true, cnpj: true },
    });

    const conditions: (SQL | undefined)[] = [
      eq(clinicFinancesTable.clinicId, clinicId),
      eq(clinicFinancesTable.employeeId, recipientId),
      eq(clinicFinancesTable.operation, "output"),
      eq(clinicFinancesTable.status, "paid"),
    ];

    if (from) {
      conditions.push(gte(clinicFinancesTable.paymentDate, dayjs(from).startOf("day").toDate()));
    }
    if (to) {
      conditions.push(lte(clinicFinancesTable.paymentDate, dayjs(to).endOf("day").toDate()));
    }

    const payments = await db.query.clinicFinancesTable.findMany({
      where: and(...conditions),
      orderBy: desc(clinicFinancesTable.paymentDate),
    });

    const rows = payments
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
            <head><title>Relatorio de Pagamentos - ${recipient.name}</title>
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
                    <h1>Relatorio de Pagamentos Recebidos</h1>
                    ${clinicInfo?.name ? `<h2>${clinicInfo.name}${clinicInfo.cnpj ? ` - ${clinicInfo.cnpj}` : ""}</h2>` : ""}
                </div>
                <div class="recipient-info"><p>Recebedor: ${recipient.name}</p></div>
                <div class="filter-info">
                    <p>Periodo: ${from ? dayjs(from).format("DD/MM/YYYY") : "Inicio"} ate ${to ? dayjs(to).format("DD/MM/YYYY") : "Fim"}</p>
                </div>
                <table>
                    <thead>
                        <tr><th>ID</th><th>Descricao</th><th>Data Pag.</th><th>Forma Pag.</th><th>Valor</th></tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
                <div class="total">Total Recebido no Periodo: ${formatCurrencyInCents(totalAmount)}</div>
                <div class="footer">Gerado em: ${dayjs().format("DD/MM/YYYY HH:mm:ss")}</div>
            </body>
        </html>
    `;

    const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" },
    });
    await browser.close();

    return new NextResponse(pdfBuffer.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="relatorio_pagamentos_${recipient.name.replace(/\s+/g, "_")}_${dayjs().format("YYYYMMDD")}.pdf"`,
      },
    });
  } catch (error) {
    console.error("GET Recipient Payment Report Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
