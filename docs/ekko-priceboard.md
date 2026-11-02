# Configurar la lista de precios de Ekko Hostel

Fuente: fotografía suministrada por el propietario el 2026-11-02.
El comando configura tarifas e inventario; no crea usuarios, reservas ni pagos.
El tenant debe existir, llamarse Ekko Hostel y estar en México/MXN.

## Confirmado

| Concepto                  | Noche                                      | Bloque de 7 noches     | Inventario                  |
| ------------------------- | ------------------------------------------ | ---------------------- | --------------------------- |
| Dormitorio mixto          | $250 por cama                              | $1.400 por cama        | Cantidad de camas pendiente |
| Dormitorio femenino       | $250 por cama                              | $1.400 por cama        | Cantidad de camas pendiente |
| Jungle                    | $800 lunes-jueves / $950 viernes-domingo   | Sin descuento indicado | Una unidad, capacidad 2     |
| UFO                       | $800 lunes-jueves / $950 viernes-domingo   | Sin descuento indicado | Una unidad, capacidad 3     |
| Portal                    | $900 lunes-jueves / $1.100 viernes-domingo | Sin descuento indicado | Una unidad, capacidad 6     |
| Camping con equipo propio | $150 por persona                           | $900 por persona       | Sin cupo cuantificado       |

Privadas: tarifa base para dos personas y adicional de $250 por persona.
Mascotas: $50 en camping y $100 en privadas, por noche.
Los kits se modelan como extras sin stock limitado, no como tipos ni unidades.
El cartel indica $300 para una persona y $500 para dos; falta aclarar si son
suplementos o totales con camping incluido.

Renta extra por noche: casa de camping $100, aislante térmico $30, sleepingbag
$50, cobija $50, almohada $30 y toalla $30. Se conserva el sistema de extras:
**cantidad × precio**. El operador debe indicar las noches/consumos en la
cantidad; no se añade un cobro automático por noche.

## Preguntas para la dueña

1. ¿Cuántas camas reservables tiene el dormitorio mixto y cuántas el femenino?
2. ¿Qué pagan niños y bebés en camping, dormitorios y como personas adicionales
   en privadas? ¿Cuáles son los rangos de edad?
3. ¿Las dos personas incluidas en privadas pueden ser cualquier combinación de
   adultos y niños? ¿Los bebés gratuitos consumen esos cupos?
4. ¿Los bebés necesitan cama propia o pueden compartir sin ocupar una plaza?
5. ¿Los $300/$500 de los kits son un adicional al camping o el total con camping
   incluido? Necesitamos el importe del equipo a cargar como extra, sin duplicar
   el alojamiento.
6. ¿Se admiten mascotas en dormitorios compartidos y qué tarifa corresponde?
   El cartel solo indica camping y privadas.

Estas preguntas también están en los comentarios y `ownerQuestions()` del script,
y aparecen en cada informe de previsualización/aplicación.

## Datos pendientes explícitos

El archivo [api/config/ekko-priceboard.json](../api/config/ekko-priceboard.json)
contiene `null` para las decisiones pendientes. Es una configuración válida:
los productos afectados se **difieren** y se informan en `deferred`; no se
inventan camas ni tarifas de menores o kits. Con el archivo actual únicamente
se cargan las seis rentas extra confirmadas.

Cuando haya respuestas:

- Completar `mixedBeds`/`femaleBeds` con las cantidades reales.
- Completar `humanPricing` con `campingRates`, `privateExtraRates` y
  `includedOccupancy`, reutilizando las categorías existentes. Los adultos del
  cartel son 15000/25000 unidades menores. No se cambian edades ni ocupación de
  bebés automáticamente.
- El motor actual tiene cupos incluidos **por categoría**. Si se confirman dos
  cupos intercambiables entre adultos y niños, adaptar esa regla antes de aplicar;
  no simularla cobrando de más.
- Completar `kitPricesIncludeCamping`: false carga extras de $300/$500;
  true carga suplementos de $150/$200 usando como referencia camping adulto
  de $150 por persona. Confirmar esa composición antes de aplicar a menores.
- La admisión de mascotas en dormitorios permanece fuera de esta entrega; no
  se inventa una tarifa ni una prohibición a partir del silencio del cartel.

La semana de camping por persona se representa con una noche gratis cada siete,
equivalente a $900 por persona con la tarifa constante de $150.

## Primero local

El tenant local verificado es `la-izuelina`. Usar su conexión local existente;
no reutilizar una conexión administrativa remota para esta prueba.

```sh
pnpm config:ekko --camping-key=la-izuelina
pnpm config:ekko --camping-key=la-izuelina --apply
```

También se puede pasar `--config=/ruta/absoluta/configuracion.json`.
El primer comando es una previsualización de solo lectura. Revisar `changes`,
`pendingQuestions`, `deferred` y `retainedTypes`; los tipos anteriores ajenos al
cartel no se borran ni deshabilitan. El segundo aplica todo en una transacción
con bloqueo de inventario, registra auditoría/evento y comprueba el resultado
mediante una nueva lectura. Una segunda aplicación idéntica devuelve cero cambios.

Los IDs son estables. Se reutilizan tipos existentes y unidades/camas sin cambiar
sus identidades. Conflictos de modo, reducción de inventario o cambios de capacidad
con reservas activas abortan toda la transacción. No se reescriben snapshots,
extras aplicados, pagos ni otros tenants. Las tarifas globales de ingresos directos
se conservan; los nuevos precios se usan mediante reservas y estadías vinculadas.

## Después del deploy, producción

No ejecutar esta etapa antes del deploy. Verificar el SHA exacto en el workflow
`Production API`, su resultado exitoso y la aplicación publicada. El pipeline
aplica migraciones y actualiza el rol restringido antes de desplegar la Lambda.
Verificar el frontend si la configuración se probará desde la UI.

Identificar el tenant de producción por lectura; no asumir la misma clave o UUID
que local. Previsualizar con su conexión administrativa existente y TLS verificado
(`DATABASE_SSL=true`, certificado confiable), y guardar el informe en un lugar
privado. El comando no despliega ni obtiene credenciales.

```sh
pnpm config:ekko --camping-key=CLAVE_PRODUCCION
pnpm config:ekko --camping-key=CLAVE_PRODUCCION \
  --apply --production --expected-camping-id=UUID_VERIFICADO \
  --deployment-sha=SHA_VERIFICADO_DE_40_CARACTERES
```

Los flags documentan la verificación del operador; el script no prueba por sí
mismo que el SHA esté desplegado. Exige además la migración de precios/camas y la
coincidencia exacta del tenant. Después de aplicar, exigir `readBackVerified: true`
y cotizar los ejemplos desde la API publicada. Si una lectura difiere, reconciliar
el estado antes de repetir.

## Pruebas

La suite usa un tenant aislado en `camping_test`, con cantidades y tarifas de
menores que son fixtures y **no decisiones reales de Ekko**. Verifica el comando
CLI, readback, idempotencia, rollback, aislamiento, pendientes, kits como extras,
precios del cartel y permisos del rol de runtime.

Ejemplos con adultos: dos camas por 7 noches $2.800 y por 15 noches $6.100;
Jungle de jueves a lunes $3.650 ($4.050 con una mascota); UFO con tres adultos
un lunes $1.050; Portal con seis adultos un viernes $2.100; camping con dos
adultos por 7 noches $1.800.

## Verificación local — 2026-11-02

- Esquema local actualizado después de un respaldo privado.
- Configuración real con pendientes en null: seis rentas confirmadas creadas,
  `readBackVerified: true`; segunda ejecución: cero cambios.
- Fingerprints iguales para perfiles, reservas, estadías, pagos, tipos/unidades,
  extras aplicados y plantillas de otros tenants.
- Suite API: 107 pruebas aprobadas, incluyendo el comando CLI y el rol de
  runtime restringido. No se ejecutó configuración ni provisioning en producción.
