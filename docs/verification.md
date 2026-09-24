# Validación local — 2026-09-23

Sin deploy, commits ni datos de producción.

- TypeScript y lint: API y UI pasan.
- Contratos: 6 pruebas. UI: 41 pruebas. API: 15 pruebas, incluidas integración PostgreSQL real, aislamiento entre campings, sesiones, entradas inválidas, JSON inválido/sobredimensionado, extras, snapshots, tarifas y carreras de cierre.
- `pnpm format:check` y diff sin errores de espacios.
- PostgreSQL 16 local: migración desde base nueva y segunda ejecución sin cambios; seed repetido sin duplicados, preservando ediciones. Identidad incompatible se rechaza.
- CLI: crear usuario, cambiar contraseña y deshabilitar; revocación transaccional de sesiones comprobada.
- Rol runtime con permisos por columna: login, ingreso, extra, presupuesto y cierre comprobados. Sin permisos de migración ni alta de usuarios.
- Persistencia: reinicio real del contenedor PostgreSQL y del proceso API conservó estadía, integrantes, ubicación y extras en base aislada `camping_browser`.
- Caso La Izuelina: 2 adultos + 1 niño + 1 bebé, dos noches = 60.000 CLP; dos paquetes de empanadas salteñas + extra libre de 5.000 = 21.000; total final 81.000. Ocupación pasó de un grupo/cuatro personas a cero al cerrar.
- Brave Work: login y formulario real; ingreso llegó a PostgreSQL. Se detectaron y corrigieron etiquetas demo duplicadas. Otra extensión bloqueó automatización después del ingreso: cierre visual completo y revisión responsive quedan pendientes; flujos correspondientes sí probados por HTTP.
- `pnpm package:lambda`: artefacto Linux, carga de handler y Argon2 correctas en imagen oficial Lambda Node 24. Evento HTTP API v2 real contra base local: anónimo 401; login 201 con cookie; camping autenticado 200.
- `cfn-lint infra/template.yaml`: sin hallazgos. No prueba recursos remotos ni costos.

Repetir pruebas: crear `camping_test` como indica README; ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm format:check`. Suite API rechaza cualquier base cuyo nombre no sea exactamente `camping_test` y reinicia sus tablas. No usar ese nombre para datos reales.

Pendiente cloud: cuenta, región, secreto, dominio, Supabase remoto, conectividad, cold start, límites y costos; despliegue requiere autorización separada.

## Pagos parciales y anticipos — 2026-09-24

- Contratos: 8 pruebas; UI: 43; API: 21, incluidas PostgreSQL real, pagos parciales, anticipos, aislamiento, idempotencia, carreras, rollback y liquidación de cierres anteriores.
- Migración aditiva de pagos aplicada a base local del piloto; no crea pagos históricos.
- Rol runtime comprobado en `camping_test`: SELECT/INSERT sobre pagos, sin UPDATE/DELETE. Pago final + cierre persistieron juntos; intento directo de editar pago rechazado con PostgreSQL 42501. Fixture y rol temporales eliminados.
- Brave Work contra API real: estadía demo de $12.000, pago parcial de $5.000 y pago final de $7.000; cierre correcto, ocupación disminuyó un grupo/una persona y pendiente global disminuyó $12.000. Otro demo recibió anticipo de $24.000 sobre costo de $12.000: UI mostró crédito $12.000 y bloqueó cierre. Ambos ejemplos permanecen en datos demo locales.
- Caché antigua de contratos precompilados por Vite produjo saldo NaN durante actualización en caliente. Se regeneró caché local; saldo real y formularios verificados después. Si ocurre al actualizar contratos con servidor abierto: detener Vite, eliminar solamente `ui/node_modules/.vite` y reiniciar `pnpm dev`.
- Esta ampliación no incluye devoluciones, edición/anulación de pagos ni procesamiento bancario. No se repitió despliegue/artefacto Lambda para estos cambios; no hubo deploy ni commits.
