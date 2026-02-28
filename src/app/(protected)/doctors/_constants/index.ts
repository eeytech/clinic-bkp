export enum BrazilianState {
  AC = "AC",
  AL = "AL",
  AP = "AP",
  AM = "AM",
  BA = "BA",
  CE = "CE",
  DF = "DF",
  ES = "ES",
  GO = "GO",
  MA = "MA",
  MT = "MT",
  MS = "MS",
  MG = "MG",
  PA = "PA",
  PB = "PB",
  PR = "PR",
  PE = "PE",
  PI = "PI",
  RJ = "RJ",
  RN = "RN",
  RS = "RS",
  RO = "RO",
  RR = "RR",
  SC = "SC",
  SP = "SP",
  SE = "SE",
  TO = "TO",
}

export const brazilianStates = Object.entries(BrazilianState).map(
  ([key, value]) => ({
    value: BrazilianState[key as keyof typeof BrazilianState],
    label: value,
  }),
);

// Lista das Especialidades Odontológicas (CFO)
export enum DentalSpecialty {
  ACUPUNTURA = "Acupuntura",
  DENTISTICA = "Dentística",
  DISFUNCAO_ATM_DOR_OROFACIAL = "Disfunção Temporomandibular e Dor Orofacial",
  ENDODONTIA = "Endodontia",
  ESTOMATOLOGIA = "Estomatologia",
  IMPLANTODONTIA = "Implantodontia",
  ODONTOLOGIA_LEGAL = "Odontologia Legal",
  ODONTOLOGIA_DO_ESPORTE = "Odontologia do Esporte",
  ODONTOLOGIA_DO_TRABALHO = "Odontologia do Trabalho",
  ODONTOLOGIA_PARA_PACIENTES_ESPECIAIS = "Odontologia para Pacientes com Necessidades Especiais",
  ODONTOGERIATRIA = "Odontogeriatria",
  ODONTOPEDIATRIA = "Odontopediatria",
  ORTODONTIA = "Ortodontia",
  PATOLOGIA_ORAL_MAXILOFACIAL = "Patologia Oral e Maxilofacial",
  PERIODONTIA = "Periodontia",
  PROTESE_DENTARIA = "Prótese Dentária",
  PROTESE_BUCO_MAXILOFACIAL = "Prótese Bucomaxilofacial",
  RADIOLOGIA_ODONTOLOGICA_IMAGINOLOGIA = "Radiologia Odontológica e Imaginologia",
  SAUDE_COLETIVA = "Saúde Coletiva",
  CIRURGIA_ORAL_MAXILOFACIAL = "Cirurgia e Traumatologia Bucomaxilofaciais",
  ORTOPEDIA_FUNCIONAL_DOS_MAXILARES = "Ortopedia Funcional dos Maxilares",
}

export const dentalSpecialties = Object.entries(DentalSpecialty).map(
  ([key, value]) => ({
    value: DentalSpecialty[key as keyof typeof DentalSpecialty],
    label: value,
  }),
);
