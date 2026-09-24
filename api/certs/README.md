# Supabase database CA

Public Supabase Root 2021 CA, downloaded 2026-09-24 from:
https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt

SHA-256 fingerprint: `807025AD50D4ED219D2C9C7D299C004F824EB00CF7F65AFEF607D07B72E6CAFA`.

Lambda loads this through `NODE_EXTRA_CA_CERTS=/var/task/certs/supabase-ca.crt`.
Local production administration must set `NODE_EXTRA_CA_CERTS` to this certificate's absolute path before starting Node. Certificate and hostname verification remain enabled.
