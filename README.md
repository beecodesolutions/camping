# Camping

Piloto de Camping La Izuelina: ingreso, ocupación, extras, pagos parciales y cierre de estadías. React + MUI + RTK Query; API NestJS + TypeORM; PostgreSQL. Contratos Zod compartidos y MSW para desarrollo/pruebas.

## Arranque local

Requisitos: Node 24.14.1 (`.nvmrc`), pnpm 10.30.1 y Docker Compose. No requiere cuenta AWS ni Supabase.

```sh
nvm use
pnpm install
pnpm db:up
pnpm db:migrate
pnpm db:seed
# Aprovisionar un usuario manual: ver api/README.md antes de ingresar.
pnpm dev
```

PostgreSQL escucha solo en `127.0.0.1:5434`, base `camping`. API en puerto 3000; Vite anuncia URL del frontend y envía `/api` por proxy. Credenciales de PostgreSQL en Compose son únicamente locales. `CAMPING_DB_PORT` permite cambiar puerto; actualizar URL de API también.

`pnpm db:down` detiene base sin borrar volumen. No usar `docker compose down -v` si se quieren conservar datos.

### Usuarios

Usuarios se aprovisionan desde CLI; no hay registro público. Contraseñas nunca se guardan en texto plano. Consultar `pnpm user --help` para crear usuario, cambiar contraseña o deshabilitarlo. Credenciales de base administrativas se reservan para migraciones, seed y CLI. No colocar secretos en variables `VITE_*`.

### Modo mock

```sh
pnpm dev:mock
```

MSW conserva datos ficticios en memoria del navegador; recargar reinicia demo. Modo real es predeterminado. `VITE_ENABLE_MOCKS=true` habilita mocks explícitamente, también en builds demo existentes. No existe bypass equivalente en API real.

### Datos ficticios para probar UI real

Después de migrar, ejecutar seed y crear usuario local:

```sh
pnpm db:seed:demo
```

Agrega 12 estadías activas y 12 cerradas a La Izuelina, identificadas con `[DEMO]`: distintas fechas, grupos, vehículos, extras de plantilla y libres. Permite probar paginación, ocupación, detalle, presupuestos y cierres. Repetir no duplica ni sobrescribe registros, tampoco reabre estadías cerradas desde UI. Fechas se calculan al crear cada registro; siguientes ejecuciones las conservan. Usa tarifas/configuración actuales y calcula cierres con la misma lógica de la API.

Solo admite PostgreSQL local y rechaza `NODE_ENV=production`. No crea usuarios, modifica plantillas ni borra datos existentes. Recargar navegador tras ejecutar. Estos registros son ficticios, no historia real del camping.

## Reglas del piloto

- Camping La Izuelina, Chile (`CL`), `CLP`, `America/Santiago`.
- Bebés 0–5: $0; niños 6–17: $6.000; adultos 18+: $12.000 por persona/noche.
- Tarifas, moneda y rangos se copian al ingreso. Cambios de tarifas afectan nuevos ingresos solamente.
- Noches = diferencia de fechas calendario, mínimo una. Cierre registra salida real; fecha estimada no libera ocupación.
- `hasVehicle` permite vehículo sin patente/descripción; no cobra automáticamente.
- Extras son plantillas, con categoría como texto libre (sin tabla aparte). Seed usa categorías del menú: Comida, Bebestibles, Cervezas, Vinos, Otras cosas, Pizzas y Servicios. Agrupación visual queda para siguiente etapa. Al aplicarlas se copian descripción, categoría y precio; editar plantilla no modifica estadías existentes.
- Extras libres no crean plantillas. Cantidad × precio unitario, cargo único; presentación forma parte de descripción (dos paquetes de seis empanadas son doce empanadas).
- Seed incluye 22 plantillas del menú proporcionado por propietario, precios de primera columna CLP. Repetir seed no duplica ni sobrescribe ediciones de plantillas.
- Cierre calcula alojamiento + extras y congela resultado; exige saldo exactamente cero. Puede registrar pago final de forma atómica. Repetir mismo cierre no duplica cargos ni pagos.
- Pagos parciales y anticipos en efectivo, transferencia o tarjeta: importe, fecha y nota. Saldo = costo calculado menos pagos registrados. Anticipo excedente se muestra como saldo a favor; no compensa deuda de otros grupos. Sin procesador de pagos, devoluciones, anulación de pagos, reservas futuras, descuentos, impuestos adicionales ni reapertura.

No se exponen huéspedes públicamente. Cada operación resuelve camping desde usuario autenticado. Todos los usuarios aprovisionados del camping tienen mismas capacidades en este piloto.

## Estructura y comandos

- `ui/`: frontend, formularios, RTK Query y MSW.
- `contracts/`: esquemas y tipos compartidos; datos confirmados de seed, sin fallback de configuración en UI real.
- `api/`: Nest, entidades, migraciones, CLI, pruebas y handler Lambda. [Contrato HTTP](docs/api.md) y [operación](api/README.md).
- `infra/template.yaml`: plantilla AWS SAM del piloto. [Despliegue y operación](docs/deployment.md).

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm format:check
pnpm package:lambda
```

Pruebas backend usan PostgreSQL real en base separada `camping_test`, nunca base del piloto. Crear una vez con `docker compose exec database createdb -U camping camping_test`. Por defecto usan `camping_test` en el mismo servidor local; para otra conexión, pasar `DATABASE_URL` con esa base. Pruebas deben fallar si apuntan a base no identificada como test.

## AWS + Supabase

Arquitectura: frontend → API Gateway HTTP API → Lambda Node 24 → PostgreSQL Supabase. No se usan Supabase Auth, Data API ni SDK desde frontend.

`pnpm package:lambda` empaqueta dentro de Linux, conserva metadata de Nest y comprueba carga del handler y Argon2 en imagen del runtime Lambda. Resultado en `.artifacts/lambda.zip`, con enlaces pnpm preservados y verificación del ZIP extraído. No ejecuta deploy.

Antes de desplegar:

1. Elegir regiones próximas entre Lambda y Supabase; revisar cuotas, presupuesto y elegibilidad Free Tier de cuenta real.
2. Crear esquema privado y rol runtime limitado con procedimiento de `api/`; usar credencial administrativa separada para migraciones/seed.
3. Runtime conecta a Supavisor **transaction mode** (puerto 6543), TLS verificado, pool pequeño. Migraciones usan conexión directa o pooler **session mode** (5432). No usar prepared statements con nombre ni estado de sesión dependiente del pooler.
4. Guardar URL runtime en secreto AWS con clave `DATABASE_URL`; plantilla recibe ARN, no valor. Rotar secreto requiere actualizar configuración de función para refrescar referencia resuelta.
5. Definir frontend y API bajo mismo sitio (dominios propios o proxy). Cookie `HttpOnly`, `Secure`, `SameSite=Lax`; origen exacto permitido. Endpoint execute-api y frontend externo no bastan para asumir cookies compatibles.
6. Ejecutar migraciones, seed y aprovisionamiento explícitamente desde entorno autorizado; nunca al arrancar Lambda.
7. Validar plantilla SAM y después autorizar despliegue por separado. Este trabajo no crea recursos remotos.

Plantilla: una Lambda, 512 MB, timeout 15s, pool 2, logs 7 días y throttling. Sin NAT, VPC, RDS, RDS Proxy ni provisioned concurrency. Concurrencia reservada opcional depende de cuota de cuenta. API no requiere acceso AWS a secretos durante cada request: referencia de CloudFormation se resuelve al desplegar; rol de despliegue necesita permiso correspondiente.

Evidencia y alcance de pruebas: [validación local](docs/verification.md).

## Limitaciones y operación

Sesiones de 12 horas y límites de login persistidos en PostgreSQL. Logout y cambio de contraseña revocan acceso. Datos de huéspedes, cookies y contraseñas no se registran en logs. No reintentar escrituras automáticamente ante resultados ambiguos de red; comprobar estadía antes de repetir ingreso o extra. Pagos usan claves de idempotencia para reintentar el mismo registro sin duplicarlo.

Supabase Free puede pausar proyectos de baja actividad y no incluye backups automáticos. Antes de usar datos reales, establecer backup cifrado externo y verificar restauración. Copias mediante `pg_dump` con URL administrativa; restaurar primero en base nueva y comprobar conteos, relaciones y acceso. No guardar dumps con huéspedes en repositorio.

AWS Free Tier y créditos no garantizan factura cero permanente. Revisar [AWS Free Tier](https://aws.amazon.com/free/free-tier-faqs/), [HTTP API](https://aws.amazon.com/api-gateway/pricing/) y [Supabase](https://supabase.com/pricing/) al abrir cuenta. Alertas de presupuesto avisan, no constituyen límite duro de gasto.

El piloto usa Vercel, Lambda y Supabase; consultar [despliegue y operación](docs/deployment.md) para recursos, verificaciones y rollback. Los costos y créditos requieren seguimiento; validación local no equivale a operación cloud verificada.

### Actualizar base local para pagos

Ejecutar `pnpm db:migrate` y reiniciar API tras actualizar código. Con rol runtime restringido, volver a ejecutar `pnpm runtime:provision` usando credencial administrativa para conceder acceso a tabla de pagos. La migración no infiere pagos para estadías existentes.
