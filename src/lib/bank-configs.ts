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
   * Si true: los movimientos internacionales (USD) se detectan por el sufijo INT] en el tag
   * en vez de buscar [INT] separado o COMPRAS INT en el merchant.
   * Ej: BCI usa [TC No Facturado INT] en vez de [INT].
   */
  intInTag?: boolean;
}

export const BANK_CONFIGS: Record<string, BankConfig> = {
  bchile: {
    id: "bchile",
    name: "Banco de Chile",
    shortName: "BChile",
    rutEnv: "BANCO_CHILE_RUT",
    passwordEnv: "BANCO_CHILE_PASSWORD",
    // Movimientos TC llevan [TC CardName ****XXXX], cuenta lleva [AccountName ****XXXX]
    allMovementsAreTC: false,
    intInTag: false,
  },
  bci: {
    id: "bci",
    name: "BCI",
    shortName: "BCI",
    rutEnv: "BCI_RUT",
    passwordEnv: "BCI_PASSWORD",
    // TC: [TC No Facturado], [TC Facturado], [TC No Facturado INT], [TC Facturado INT]
    // Cuenta: [CC] o [AccountLabel]
    allMovementsAreTC: false,
    intInTag: true, // INT viene dentro del tag: [TC No Facturado INT]
  },
  bice: {
    id: "bice",
    name: "BICE",
    shortName: "BICE",
    rutEnv: "BICE_RUT",
    passwordEnv: "BICE_PASSWORD",
    // BICE devuelve solo movimientos TC (no mezcla cuenta corriente)
    allMovementsAreTC: true,
    intInTag: false,
  },
  edwards: {
    id: "edwards",
    name: "Banco Edwards",
    shortName: "Edwards",
    rutEnv: "EDWARDS_RUT",
    passwordEnv: "EDWARDS_PASSWORD",
    // Mismo portal que BChile, mismo formato
    allMovementsAreTC: false,
    intInTag: false,
  },
  falabella: {
    id: "falabella",
    name: "Banco Falabella",
    shortName: "Falabella",
    rutEnv: "FALABELLA_RUT",
    passwordEnv: "FALABELLA_PASSWORD",
    // TC: [TC Por Facturar], [TC Facturados]; Cuenta: sin tag o tag distinto
    allMovementsAreTC: false,
    intInTag: false,
  },
  itau: {
    id: "itau",
    name: "Itaú",
    shortName: "Itaú",
    rutEnv: "ITAU_RUT",
    passwordEnv: "ITAU_PASSWORD",
    // TC: [TC Por Facturar], [TC Facturados]; Cuenta: [Cuenta Corriente]
    // Requiere aprobación en app Itaú Key (2FA)
    allMovementsAreTC: false,
    intInTag: false,
  },
  santander: {
    id: "santander",
    name: "Santander",
    shortName: "Santander",
    rutEnv: "SANTANDER_RUT",
    passwordEnv: "SANTANDER_PASSWORD",
    // TC: [TC Por Facturar], [TC Facturados]
    allMovementsAreTC: false,
    intInTag: false,
  },
  scotiabank: {
    id: "scotiabank",
    name: "Scotiabank",
    shortName: "Scotia",
    rutEnv: "SCOTIABANK_RUT",
    passwordEnv: "SCOTIABANK_PASSWORD",
    // Scotiabank devuelve movimientos sin prefijo [TC], todos son de TC
    allMovementsAreTC: true,
    intInTag: false,
  },
};
