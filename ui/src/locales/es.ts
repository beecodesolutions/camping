const es = {
  common: {
    appName: 'Camping',
    retry: 'Reintentar',
    lightTheme: 'Cambiar a tema claro',
    darkTheme: 'Cambiar a tema oscuro',
  },
  home: {
    morning: 'Buenos días',
    afternoon: 'Buenas tardes',
    evening: 'Buenas noches',
    greetingWithName: '{{greeting}}, {{name}}',
    loading: 'Cargando resumen',
    loadError: 'No pudimos cargar el resumen del camping.',
    occupancy: 'Ocupación actual',
    groups_one: 'grupo alojado',
    groups_other: 'grupos alojados',
    people_one: 'persona',
    people_other: 'personas',
    vehicles_one: 'vehículo',
    vehicles_other: 'vehículos',
    pendingBalance: 'Pendiente de cobro',
    accumulatedBalance: 'saldo acumulado',
    historyTitle: 'Ocupación · últimos 7 días',
    historyDescription: 'Grupos alojados por día',
    historySeries: 'Grupos alojados',
  },
  checkIn: {
    register: '+ Registrar ingreso',
  },
  errors: {
    startup:
      'No se pudo iniciar la aplicación. Recargá la página para reintentar.',
  },
} as const

export default es
