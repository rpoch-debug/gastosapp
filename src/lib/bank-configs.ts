export type TrackingMode = "tc" | "debit" | "both";

export interface BankConfig {
  id: string;
  name: string;
  shortName: string;
  rutEnv: string;
  passwordEnv: string;
  /**
   * Si true: todos los movimientos devueltos son TC (no necesita filtrar por prefijo [TC]).
   * Si false: los movimientos vienen mezclados (cuenta + TC) y se filtra por prefijo [TC ...].
   */
  allMovementsAreTC?: boolean;
  /**
   * Si true: los movimientos internacionales (USD) se detectan por el sufijo INT] en el tag.
   * Ej: BCI usa [TC No Facturado INT] en vez de [INT] separado.
   */
  intInTag?: boolean;
  /**
   * Si true: el banco también entrega movimientos de cuenta corriente (débito),
   * por lo que el usuario puede elegir qué trackear: TC, débito o ambos.
   */
  supportsDebit: boolean;
}

export const BANK_CONFIGS: Record<string, BankConfig> = {
  bchile: {
    id: "bchile",
    name: "Banco de Chile",
    shortName: "BChile",
    rutEnv: "BANCO_CHILE_RUT",
    passwordEnv: "BANCO_CHILE_PASSWORD",
    allMovementsAreTC: false,
    intInTag: false,
    supportsDebit: true,
  },
  bci: {
    id: "bci",
    name: "BCI",
    shortName: "BCI",
    rutEnv: "BCI_RUT",
    passwordEnv: "BCI_PASSWORD",
    allMovementsAreTC: false,
    intInTag: true,
    supportsDebit: true,
  },
  bice: {
    id: "bice",
    name: "BICE",
    shortName: "BICE",
    rutEnv: "BICE_RUT",
    passwordEnv: "BICE_PASSWORD",
    allMovementsAreTC: true,
    intInTag: false,
    supportsDebit: false, // scraper solo retorna TC
  },
  edwards: {
    id: "edwards",
    name: "Banco Edwards",
    shortName: "Edwards",
    rutEnv: "EDWARDS_RUT",
    passwordEnv: "EDWARDS_PASSWORD",
    allMovementsAreTC: false,
    intInTag: false,
    supportsDebit: true,
  },
  falabella: {
    id: "falabella",
    name: "Banco Falabella",
    shortName: "Falabella",
    rutEnv: "FALABELLA_RUT",
    passwordEnv: "FALABELLA_PASSWORD",
    allMovementsAreTC: false,
    intInTag: false,
    supportsDebit: true,
  },
  itau: {
    id: "itau",
    name: "Itaú",
    shortName: "Itaú",
    rutEnv: "ITAU_RUT",
    passwordEnv: "ITAU_PASSWORD",
    allMovementsAreTC: false,
    intInTag: false,
    supportsDebit: true,
  },
  santander: {
    id: "santander",
    name: "Santander",
    shortName: "Santander",
    rutEnv: "SANTANDER_RUT",
    passwordEnv: "SANTANDER_PASSWORD",
    allMovementsAreTC: false,
    intInTag: false,
    supportsDebit: true,
  },
  scotiabank: {
    id: "scotiabank",
    name: "Scotiabank",
    shortName: "Scotia",
    rutEnv: "SCOTIABANK_RUT",
    passwordEnv: "SCOTIABANK_PASSWORD",
    allMovementsAreTC: true,
    intInTag: false,
    supportsDebit: false, // scraper solo retorna TC
  },
};
