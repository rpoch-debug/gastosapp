export interface BankConfig {
  id: string;
  name: string;
  shortName: string;
  rutEnv: string;
  passwordEnv: string;
}

export const BANK_CONFIGS: Record<string, BankConfig> = {
  bchile: {
    id: "bchile",
    name: "Banco de Chile",
    shortName: "BChile",
    rutEnv: "BANCO_CHILE_RUT",
    passwordEnv: "BANCO_CHILE_PASSWORD",
  },
  bci: {
    id: "bci",
    name: "BCI",
    shortName: "BCI",
    rutEnv: "BCI_RUT",
    passwordEnv: "BCI_PASSWORD",
  },
  bice: {
    id: "bice",
    name: "BICE",
    shortName: "BICE",
    rutEnv: "BICE_RUT",
    passwordEnv: "BICE_PASSWORD",
  },
  edwards: {
    id: "edwards",
    name: "Banco Edwards",
    shortName: "Edwards",
    rutEnv: "EDWARDS_RUT",
    passwordEnv: "EDWARDS_PASSWORD",
  },
  falabella: {
    id: "falabella",
    name: "Banco Falabella",
    shortName: "Falabella",
    rutEnv: "FALABELLA_RUT",
    passwordEnv: "FALABELLA_PASSWORD",
  },
  itau: {
    id: "itau",
    name: "Itaú",
    shortName: "Itaú",
    rutEnv: "ITAU_RUT",
    passwordEnv: "ITAU_PASSWORD",
  },
  santander: {
    id: "santander",
    name: "Santander",
    shortName: "Santander",
    rutEnv: "SANTANDER_RUT",
    passwordEnv: "SANTANDER_PASSWORD",
  },
  scotiabank: {
    id: "scotiabank",
    name: "Scotiabank",
    shortName: "Scotia",
    rutEnv: "SCOTIABANK_RUT",
    passwordEnv: "SCOTIABANK_PASSWORD",
  },
};
