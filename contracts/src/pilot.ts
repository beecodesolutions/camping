/** Confirmed pilot configuration. Seed only: never imported as API fallback. */
export const pilotCamping = {
  key: 'la-izuelina',
  name: 'Camping La Izuelina',
  country: 'CL' as const,
  currency: 'CLP',
  timezone: 'America/Santiago',
  ageRanges: {
    infants: { min: 0, max: 5 },
    children: { min: 6, max: 17 },
    adults: { min: 18, max: null },
  },
  rates: { adults: 12000, children: 6000, infants: 0 },
}
/** CLP column from owner's menu; quantity counts the named presentation. */
export const pilotExtras = [
  {
    category: 'Comida',
    key: 'empanadas-saltenas',
    description: 'Empanadas salteñas (6 unidades)',
    unitPriceMinor: 8000,
  },
  {
    category: 'Comida',
    key: 'empanadas-jamon-queso',
    description: 'Empanadas de jamón y queso (6 unidades)',
    unitPriceMinor: 8000,
  },
  {
    category: 'Comida',
    key: 'chorizo',
    description: 'Chorizo argentino (1 kg)',
    unitPriceMinor: 8000,
  },
  {
    category: 'Comida',
    key: 'morcilla',
    description: 'Morcilla',
    unitPriceMinor: 3500,
  },
  {
    category: 'Bebestibles',
    key: 'gaseosa',
    description: 'Gaseosa',
    unitPriceMinor: 2800,
  },
  {
    category: 'Bebestibles',
    key: 'agua',
    description: 'Agua mineral (5 litros)',
    unitPriceMinor: 5000,
  },
  {
    category: 'Cervezas',
    key: 'patagonia',
    description: 'Cerveza Patagonia',
    unitPriceMinor: 2500,
  },
  {
    category: 'Cervezas',
    key: 'torobayo',
    description: 'Cerveza Torobayo',
    unitPriceMinor: 3300,
  },
  {
    category: 'Cervezas',
    key: 'calafate',
    description: 'Cerveza Austral Calafate',
    unitPriceMinor: 3500,
  },
  {
    category: 'Vinos',
    key: 'santa-emiliana',
    description: 'Vino Santa Emiliana tinto',
    unitPriceMinor: 5000,
  },
  {
    category: 'Vinos',
    key: 'medalla-real',
    description: 'Vino Medalla Real tinto',
    unitPriceMinor: 7000,
  },
  {
    category: 'Vinos',
    key: 'duque-rivas',
    description: 'Vino Duque Rivas',
    unitPriceMinor: 3000,
  },
  {
    category: 'Otras cosas',
    key: 'hielo',
    description: 'Hielo (1 kg)',
    unitPriceMinor: 1500,
  },
  {
    category: 'Otras cosas',
    key: 'carbon',
    description: 'Carbón (3 kg)',
    unitPriceMinor: 3800,
  },
  {
    category: 'Pizzas',
    key: 'pizza-mozzarella',
    description: 'Pizza mozzarella',
    unitPriceMinor: 11000,
  },
  {
    category: 'Pizzas',
    key: 'pizza-fugazzeta',
    description: 'Pizza fugazzeta',
    unitPriceMinor: 12000,
  },
  {
    category: 'Pizzas',
    key: 'pizza-pepperoni',
    description: 'Pizza pepperoni',
    unitPriceMinor: 12000,
  },
  {
    category: 'Pizzas',
    key: 'pizza-especial',
    description: 'Pizza especial',
    unitPriceMinor: 13000,
  },
  {
    category: 'Pizzas',
    key: 'pizza-napolitana',
    description: 'Pizza napolitana',
    unitPriceMinor: 12500,
  },
  {
    category: 'Pizzas',
    key: 'pizza-napolitana-jamon',
    description: 'Pizza napolitana con jamón',
    unitPriceMinor: 13500,
  },
  {
    category: 'Servicios',
    key: 'lavado',
    description: 'Lavado de ropa',
    unitPriceMinor: 5000,
  },
  {
    category: 'Servicios',
    key: 'secado',
    description: 'Secado de ropa',
    unitPriceMinor: 5000,
  },
]
