# OpenAPI

The API publishes the current pilot contract as an OpenAPI 3.0 document when
the API process is running:

- Swagger UI: `/api/docs`
- JSON document: `/api/openapi.json`

The documentation uses the session cookie `camping_session` for authenticated
operations. Request and response schemas are generated from the canonical Zod
contracts with Zod's native `z.toJSONSchema` conversion. Check-in uses the
input view of its contract so its runtime transform does not disappear from
the documented request shape. A conversion that cannot be represented is an
error; it is never silently emitted as an unconstrained `any` schema.

When trying authenticated calls from Swagger UI during local development,
include the UI origin in `ALLOWED_ORIGIN` (for example,
`ALLOWED_ORIGIN=http://localhost:3000,http://localhost:5173` when opening
Swagger at port 3000), or supply an existing session cookie. Mutating routes
require an allowed `Origin` header by design.

Production does not expose the documentation unless `OPENAPI_ENABLED=true` is
set. The static exporter first compiles the shared contracts and API, then runs
regardless of `NODE_ENV`; it does not initialize TypeORM or require
`DATABASE_URL`:

```sh
pnpm api:openapi
pnpm api:openapi -- --out /tmp/camping-openapi.json
```

The default output is `docs/openapi.json`. The document describes the routes
implemented by the current controllers, including validation, authentication,
origin, not-found, conflict, payload-size, and internal-error responses where
they apply. It includes the reservation model, quote, lifecycle, account,
payment, and pagination components together with the stage 2 accommodation
and availability components. Reservation list query input is derived from the
canonical Zod contract, including numeric query coercion and its documented
defaults; date-range and cross-field rules remain enforced by the service. The
reservation response account contains the frozen agreed total, paid total,
and signed balance, without an accrued-date field. The future RTK Query client
is not generated in this stage. The reservation `source` field documents the
booking channel; the technical mutation origin is an event concern and is
published as `origin: manual` with the channel in `bookingSource`.
