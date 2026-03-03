import "dayjs/locale/pt-br";

import dayjs from "dayjs";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { z } from "zod";

import { db } from "@/db";
import { clinicFinancesTable } from "@/db/schema";
import { formatCurrencyInCents } from "@/helpers/currency";
import { getAuthorizedClinicContextForApi } from "@/lib/auth/clinic-context";

dayjs.locale("pt-br");

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params: paramsPromise }: RouteContext) {
  try {
    const context = await getAuthorizedClinicContextForApi();
    if (!context.ok) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }

    const { clinicId } = context;
    const params = await paramsPromise;

    const validationResult = paramsSchema.safeParse(params);
    if (!validationResult.success) {
      return NextResponse.json({ error: "Invalid transaction ID" }, { status: 400 });
    }

    const transactionId = validationResult.data.id;

    const transaction = await db.query.clinicFinancesTable.findFirst({
      where: and(
        eq(clinicFinancesTable.id, transactionId),
        eq(clinicFinancesTable.clinicId, clinicId),
      ),
      with: {
        patient: { columns: { name: true } },
        employee: { columns: { name: true } },
        clinic: {
          columns: {
            name: true,
            cnpj: true,
            addressStreet: true,
            addressNumber: true,
            addressCity: true,
            addressState: true,
            phone: true,
          },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const relevantDate = transaction.paymentDate ?? transaction.dueDate ?? transaction.createdAt;
    const formattedRelevantDate = relevantDate
      ? dayjs(relevantDate).format("DD/MM/YYYY HH:mm")
      : "-";
    const formattedDueDate = transaction.dueDate
      ? dayjs(transaction.dueDate).format("DD/MM/YYYY")
      : "-";

    const htmlContent = `
      <html>
        <head><title>Recibo</title>
          <style>
            body { font-family: sans-serif; padding: 20px; font-size: 12px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px;}
            .clinic-info { margin-bottom: 15px; font-size: 10px; color: #333; }
            .details { border-collapse: collapse; width: 100%; margin-bottom: 20px;}
            .details th, .details td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .details th { background-color: #f2f2f2; font-weight: bold; }
            .total { font-weight: bold; font-size: 1.1em; text-align: right; margin-top: 15px; padding-top: 10px; border-top: 1px solid #eee;}
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #777; }
            .label { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Recibo</h1>
            ${transaction.clinic?.name ? `<h2>${transaction.clinic.name}</h2>` : ""}
          </div>
          <div class="clinic-info">
            ${transaction.clinic?.cnpj ? `<p><span class="label">CNPJ:</span> ${transaction.clinic.cnpj}</p>` : ""}
            ${transaction.clinic?.addressStreet ? `<p><span class="label">Endereco:</span> ${transaction.clinic.addressStreet}, ${transaction.clinic.addressNumber} - ${transaction.clinic.addressCity}/${transaction.clinic.addressState}</p>` : ""}
            ${transaction.clinic?.phone ? `<p><span class="label">Telefone:</span> ${transaction.clinic.phone}</p>` : ""}
          </div>

          <table class="details">
            <tr><th width="30%">ID da Transacao</th><td>${transaction.id}</td></tr>
            <tr><th>Data ${transaction.status === "paid" && transaction.paymentDate ? "do Pagamento" : "do Lancamento"}</th><td>${formattedRelevantDate}</td></tr>
            ${transaction.dueDate ? `<tr><th>Data de Vencimento</th><td>${formattedDueDate}</td></tr>` : ""}
            <tr><th>Operacao</th><td>${transaction.operation === "input" ? "Entrada" : "Saida"}</td></tr>
            <tr><th>Tipo</th><td>${transaction.typeInput || transaction.typeOutput}</td></tr>
            ${transaction.patient ? `<tr><th>Paciente</th><td>${transaction.patient.name}</td></tr>` : ""}
            ${transaction.employee ? `<tr><th>Funcionario/Medico</th><td>${transaction.employee.name}</td></tr>` : ""}
            <tr><th>Descricao</th><td>${transaction.description}</td></tr>
            ${transaction.paymentMethod && transaction.status === "paid" ? `<tr><th>Forma de Pagamento</th><td>${transaction.paymentMethod}</td></tr>` : ""}
            <tr><th>Status</th><td>${transaction.status}</td></tr>
            ${transaction.observations ? `<tr><th>Observacoes</th><td>${transaction.observations}</td></tr>` : ""}
          </table>

          <div class="total">Valor: ${formatCurrencyInCents(transaction.amountInCents)}</div>

          <div class="footer">Gerado em: ${dayjs().format("DD/MM/YYYY HH:mm:ss")}</div>
        </body>
      </html>
    `;

    const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    return new NextResponse(pdfBuffer.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="recibo_${transactionId}.pdf"`,
      },
    });
  } catch (error) {
    console.error("GET Receipt Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error generating receipt" },
      { status: 500 },
    );
  }
}
