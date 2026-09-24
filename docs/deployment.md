# Camping production

Frontend: https://camping-theta-rose.vercel.app

- Vercel project `camping`, root directory `ui`, Hobby plan. Production `VITE_ENABLE_MOCKS=false`; API defaults to `/api`.
- `ui/vercel.json` proxies `/api` to API Gateway and falls back to the SPA. Login requires the canonical frontend origin above.
- AWS account `048834125079`, region `us-east-1`, CloudFormation stack `camping-production`. Use named CLI profile `camping`; never the workstation default profile.
- Supabase Free project `xpnleaxbatypnbbwzeku`, region `us-east-1`. Private schema `camping_private`; TLS enforced. Runtime uses restricted `camping_runtime` through transaction pooler port 6543; administration uses session pooler port 5432.
- Database URL is in AWS Secrets Manager `camping/production/database`, never Vercel or Git. Public database CA is bundled in Lambda; see `api/certs/README.md`.

## Publish API

Authenticate with AWS CLI 2.32+ using `aws login --profile camping`. Check account identity before writes. Run `pnpm package:lambda` (Docker, zip, and unzip required), which verifies the extracted ZIP and Node 24 async handler signature, then `aws cloudformation package` with `infra/template.yaml` and the private bucket `camping-deploy-048834125079-us-east-1`. Deploy the packaged template to `camping-production` with `CAPABILITY_IAM CAPABILITY_AUTO_EXPAND`, the canonical `AllowedOrigin`, and existing `DatabaseSecretArn`.

No migrations or seeds run on Lambda startup. Set `NODE_EXTRA_CA_CERTS` to the absolute path of `api/certs/supabase-ca.crt`, `DATABASE_SSL=true`, and supply `DATABASE_ADMIN_URL` privately for administration. Never put database passwords on the command line or in Git.

## Fictional test camping

`Camping Valle Escondido` is isolated from `Camping La Izuelina`. Bootstrap with:

```sh
pnpm --filter @camping/api seed:test --config-only
pnpm user -- create --username=USER --name='Display name' --camping-key=valle-escondido --password-stdin
pnpm --filter @camping/api seed:test
```

Password is read from stdin. Seed inserts missing records only; reruns preserve existing stays, payments, extras, and operator edits. It creates three active and three historical stays with payments and extras. No demo markers appear in user-facing data. The original local-only `db:seed:demo` remains separate and must not be used in production.

## Checks and rollback

After API/frontend deployment, verify login, Secure/HttpOnly/SameSite cookies, active and historical stays, session persistence, logout, rejection without authentication, and rejected foreign origins. Check that La Izuelina contains no fictional stays.

For frontend rollback, promote a known-good Vercel deployment; the former mock deployment is `camping-1n4f3vkyk-federico-alois-projects.vercel.app`. API rollback uses the prior packaged CloudFormation template/artifact. Do not revert database migrations as an automatic rollback.

AWS paid account had $100 signup credits at deployment; no paid upgrades were selected. Credits are not a permanent spending cap. Check remaining credits and actual billing before further operation. Supabase Free has no managed backup guarantee; establish and test encrypted backups before entering real guest data. Enable root-account MFA manually and use a non-root deployment identity for subsequent operations.
