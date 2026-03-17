const CATEGORY_RULES: Record<string, string[]> = {
  Supermercado: [
    "LIDER", "JUMBO", "SANTA ISABEL", "UNIMARC", "TOTTUS",
    "MAYORISTA", "ACUENTA", "SUPER", "FRESH MARKET",
  ],
  Restaurantes: [
    "RESTAURANT", "RESTORAN", "CAFE", "COFFEE", "STARBUCKS", "MCDONALD", "MC DONALD",
    "BURGER", "PIZZA", "SUSHI", "RAPPI", "UBER EATS", "PEDIDOS YA",
    "CORNERSHOP", "DOMINOS", "SUBWAY", "KFC", "DUNKIN",
    "GASTRONOMICO", "BACKYARD", "BUTCHER", "SOLER",
  ],
  Transporte: [
    "UBER", "DIDI", "CABIFY", "BEAT", "COPEC", "SHELL",
    "PETROBRAS", "ENEX", "ESTACION", "PEAJE", "AUTOPISTA",
    "METRO", "BIP", "PARKING", "ESTACIONAMIENTO",
    "ARAMCO", "EDS ", "NAVIERA", "FEDEX", "YAMAHA",
  ],
  Entretenimiento: [
    "NETFLIX", "SPOTIFY", "DISNEY", "HBO", "AMAZON PRIME",
    "STEAM", "PLAYSTATION", "XBOX", "CINE", "HOYTS",
    "CINEMARK", "YOUTUBE", "APPLE.COM/BILL", "CRUNCHYROLL",
    "FLOW ", "BIOPARQUE", "BUINZOO", "TRAVEL CLUB",
  ],
  Salud: [
    "FARMACIA", "CRUZ VERDE", "SALCOBRAND", "AHUMADA",
    "DOCTOR", "CLINICA", "HOSPITAL", "DENTAL", "OPTICA",
    "LABORATORIO", "SPORTLIFE", "CUIDAPET",
  ],
  Ropa: [
    "ZARA", "H&M", "FALABELLA", "RIPLEY", "PARIS",
    "NIKE", "ADIDAS", "FASHION", "TRICOT", "HITES",
    "DECATHLON",
  ],
  Hogar: [
    "SODIMAC", "EASY", "IKEA", "HOMECENTER", "IMPERIAL",
    "FERRETERIA", "CASA&IDEAS", "CASA IDEAS",
    "REPUES", "COMERCIAL JEREMIAS",
  ],
  Tecnologia: [
    "APPLE", "PCFACTORY", "SOLOTODO", "MERCADOLIBRE",
    "AMAZON", "ALIEXPRESS", "MICROPLAY", "WECOMPLIANCE",
  ],
  Servicios: [
    "MOVISTAR", "ENTEL", "WOM", "CLARO", "VTR",
    "ENEL", "AGUAS", "METROGAS", "CHILQUINTA",
    "MUNIC", "REDGLOBA", "MISIONERO",
  ],
  Compras: [
    "MERCADOPAGO", "MERCADO PAGO", "TIENDA",
  ],
  Educacion: [
    "UNIVERSIDAD", "UDEMY", "COURSERA", "LIBRO", "LIBRERIA",
  ],
};

export function categorize(merchant: string): string {
  const upper = merchant.toUpperCase();

  for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
    if (keywords.some((kw) => upper.includes(kw))) {
      return category;
    }
  }

  return "Otros";
}

export const CATEGORIES = [
  "Supermercado",
  "Restaurantes",
  "Transporte",
  "Entretenimiento",
  "Salud",
  "Ropa",
  "Hogar",
  "Tecnologia",
  "Servicios",
  "Compras",
  "Educacion",
  "Otros",
];

export const CATEGORY_COLORS: Record<string, string> = {
  Supermercado: "#22c55e",
  Restaurantes: "#f97316",
  Transporte: "#3b82f6",
  Entretenimiento: "#a855f7",
  Salud: "#ef4444",
  Ropa: "#ec4899",
  Hogar: "#eab308",
  Tecnologia: "#06b6d4",
  Servicios: "#64748b",
  Compras: "#f59e0b",
  Educacion: "#14b8a6",
  Otros: "#9ca3af",
};
