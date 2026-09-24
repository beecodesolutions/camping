# Camping API operations

All commands load `api/.env` through Node's `--env-file-if-exists=.env` flag. Copy `.env.example` to `.env` for local work. Do not place browser or Vercel credentials in this file.

`DATABASE_URL` is the runtime connection. `DATABASE_ADMIN_URL`, when present, is used only by migration, seed, user administration, and role provisioning. Production should use separate credentials. The application schema is fixed at `camping_private`.

## Database setup

From the repository root:

```bash
pnpm db:up
pnpm db:migrate
pnpm db:seed
```

The migration command creates the private schema before TypeORM creates its migration metadata. Seed inserts missing stable keys only: reruns neither duplicate rows nor overwrite rates, prices, categories, enabled flags, or other operator edits. It refuses to run if the stable camping key points to a different fixed name, country, currency, timezone, or age-range identity.

For production, run migrations and seed with the administrative direct/session-mode URL. Then provision an existing runtime role:

```bash
DATABASE_RUNTIME_ROLE=camping_runtime pnpm --filter @camping/api runtime:provision
```

To create a missing login role without echoing its password:

```bash
printf 'Runtime database password: ' >&2
read -rs password
printf '\n' >&2
printf %s "$password" | pnpm --filter @camping/api runtime:provision -- --role=camping_runtime --create-role --password-stdin
unset password
```

The provisioner grants `USAGE` on `camping_private` plus only the table and column operations used by the API. It grants no ownership, migration, seed, broad future-table, or database-create capability. Rerun it after a migration that adds tables or runtime columns. Put the resulting runtime URL in the AWS secret. The schema is outside Supabase's exposed `public` schema; do not add it to the Data API exposed-schema list.

## Users

There is no public registration. The CLI never accepts a password command argument and never uses an echoing prompt.

```bash
pnpm user -- --help

printf 'User password: ' >&2
read -rs password
printf '\n' >&2
printf %s "$password" | pnpm user -- create --username=owner --name='Camping owner' --password-stdin
unset password
```

Password changes and disabling a user lock the same database row used by login, update the account, and revoke every active session in one transaction:

```bash
printf 'New password: ' >&2
read -rs password
printf '\n' >&2
printf %s "$password" | pnpm user -- change-password --username=owner --password-stdin
unset password

pnpm user -- disable --username=owner
```

`USER_PASSWORD` and `RUNTIME_PASSWORD` are supported for non-interactive secret injection. Do not store them in `.env` or shell history.
