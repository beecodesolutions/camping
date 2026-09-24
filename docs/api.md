# Contrato del piloto

Base `/api`. JSON; cookie de sesión `camping_session`. Todos los endpoints de negocio requieren sesión. Mutaciones verifican `Origin`; producción exige origen HTTPS configurado. No se acepta `camping_id` ni `campingId` en cuerpos: ámbito viene del usuario autenticado.

| Método | Ruta                                      | Resultado                                                                |
| ------ | ----------------------------------------- | ------------------------------------------------------------------------ |
| POST   | `/auth/login`                             | Usuario y cookie de 12 horas                                             |
| GET    | `/auth/session`                           | Usuario autenticado                                                      |
| POST   | `/auth/logout`                            | Revoca sesión y elimina cookie                                           |
| GET    | `/camping`                                | Configuración persistida y ocupación activa                              |
| PATCH  | `/camping/rates`                          | Tarifas para futuros ingresos                                            |
| POST   | `/stays`                                  | Registra ingreso; devuelve `{ id }`                                      |
| GET    | `/stays?status=active&page=1&pageSize=25` | Página de estadías; `status=closed` para cerradas, máximo 100 por página |
| GET    | `/stays/:id`                              | Detalle, extras aplicados y cierre si existe                             |
| POST   | `/stays/:id/quote`                        | Presupuesto con `{ departureDate }`; devuelve versión                    |
| POST   | `/stays/:id/payments`                     | Registra pago parcial o anticipo idempotente                             |
| POST   | `/stays/:id/close`                        | Cierra con `{ departureDate, version, payment? }`; saldo final cero      |
| GET    | `/extra-templates`                        | Plantillas del camping, incluidas desactivadas                           |
| POST   | `/extra-templates`                        | Crea plantilla                                                           |
| PATCH  | `/extra-templates/:id`                    | Edita o desactiva plantilla                                              |
| POST   | `/stays/:id/extras`                       | Aplica plantilla o extra libre                                           |
| PATCH  | `/stays/:id/extras/:extraId`              | Edita copia aplicada                                                     |
| DELETE | `/stays/:id/extras/:extraId`              | Elimina copia aplicada de estadía abierta                                |

Pagos: `POST /stays/:id/payments` registra un pago parcial o anticipo y devuelve estadía actualizada. Cuerpo: `{ amountMinor, method, paidOn, note?, idempotencyKey }`. Importe entero positivo en moneda de la estadía; medios `cash`, `transfer`, `card`; fecha calendario no futura según zona horaria del camping. `idempotencyKey` UUID identifica el intento lógico: reenviar mismos datos conserva un único pago; reutilizar clave para otros datos o estadía responde 409.

`GET /stays/:id` incluye `payments` (importe, medio, fecha, nota y auditoría) y `account`: `totalMinor`, `paidMinor`, `balanceMinor`, `asOfDate`. Para estadías abiertas se calcula alojamiento acumulado hasta hoy más extras; para cerradas se usa costo final congelado. Saldo negativo representa anticipo a favor. `GET /camping` incluye `pendingAmountMinor`: suma de saldos positivos por estadía, sin compensar créditos de otros huéspedes.

El presupuesto de cierre incluye `account` calculado con fecha de salida elegida. Cierre exige saldo exactamente cero; `payment` opcional registra el pago final y cierra en una sola transacción. Si falla versión, validación o saldo, no guarda ese pago. Anticipos mayores al costo acumulado se admiten en estadías abiertas; si sobra crédito al cierre, no se puede cerrar hasta resolverlo. Este MVP no incluye devoluciones ni edición/anulación de pagos. Registrar pago es anotar cobro recibido, no ejecutar cargo bancario.

Estadías cerradas antes de habilitar pagos conservan su cierre y pueden registrar cobros pendientes hasta completar costo final. No se inventan pagos históricos al migrar. Sus saldos reflejan exclusivamente pagos registrados.

Ingreso conserva responsable, documento, nacionalidad ISO, teléfono E.164, fechas, cantidades por rango, vehículo y ubicación. Strings opcionales se envían vacíos; no se persisten edades individuales. Esquemas exactos y validaciones compartidas: [contracts/src/index.ts](../contracts/src/index.ts).

Plantilla: `{ description, category?, unitPriceMinor }`. `category` es texto libre de hasta 100 caracteres; omitir al crear equivale a vacío. PATCH de plantilla preserva campos omitidos. No hay entidad ni identificador de categoría.

Aplicación desde plantilla: `{ templateId, quantity }`. Extra libre: `{ description, category?, unitPriceMinor, quantity }`. Precio CLP en pesos enteros, cantidad entera positiva. Se copia categoría/descripción/precio; cambios posteriores de plantilla no alteran estadías. Editar extra aplicado requiere descripción, precio y cantidad; categoría omitida se conserva.

Presupuesto devuelve `nights`, `accommodationMinor`, `extrasMinor`, `totalMinor` y `version`. Cierre requiere esa versión: si cambió un extra o se registró un pago, responde `409 STALE_STAY`; pedir nuevo presupuesto y confirmar de nuevo. Repetir cierre con igual fecha devuelve cierre original; distinta fecha responde 409. Cierre, pagos y modificaciones de extras bloquean la misma fila para evitar costos inconsistentes.

Validación devuelve 400; falta de sesión 401; origen rechazado 403; recurso inexistente o de otro camping 404; conflicto 409. Respuestas no se cachean. No reintentar automáticamente ingresos/extras tras error de red ambiguo: consultar antes para evitar duplicados. Cierre y registro de pagos soportan repetición idempotente. Si el cierre incluye pago, conservar también su clave y datos al reintentar.
