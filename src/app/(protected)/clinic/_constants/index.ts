export enum ClinicPaymentMethod {
  DINHEIRO_EM_ESPECIE = "Dinheiro Em Espécie",
  CARTAO_DE_DEBITO = "Cartão De Débito",
  CARTAO_DE_CREDITO = "Cartão De Crédito",
  CARTAO_PRE_PAGO = "Cartão Pré-Pago",
  BOLETO_BANCARIO = "Boleto Bancário",
  PIX = "Pix",
  TRANSFERENCIA_TED = "Transferência TED",
  TRANSFERENCIA_DOC = "Transferência DOC",
  TRANSFERENCIA_ENTRE_CONTAS_DO_MESMO_BANCO = "Transferência Entre Contas Do Mesmo Banco",
  DEBITO_AUTOMATICO = "Débito Automático",
  CARTEIRAS_DIGITAIS = "Carteiras Digitais",
  PAGAMENTO_VIA_QR_CODE = "Pagamento Via QR Code",
  CONVENIOS_CARNES = "Convênios / Carnês",
  SAQUE_PAGAMENTO_EM_ESPECIE = "Saque / Pagamento Em Espécie",
  PAGAMENTO_RECORRENTE_ASSINATURA = "Pagamento Recorrente / Assinatura",
  FINANCIAMENTO_OU_CREDITO_DIRETO = "Financiamento Ou Crédito Direto",
  CHEQUE = "Cheque",
  DEPOSITO_BANCARIO = "Depósito Bancário",
}

export const clinicPaymentMethods = Object.entries(ClinicPaymentMethod).map(
  ([key, value]) => ({
    value: ClinicPaymentMethod[key as keyof typeof ClinicPaymentMethod],
    label: value,
  }),
);
