#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Production dependencies are installed in Linux; no host node_modules copied.
docker build --platform linux/amd64 -f Dockerfile.lambda --output type=local,dest=.artifacts/lambda .
# Load handler and native password library on the exact Lambda runtime image.
docker run --rm --platform linux/amd64 --entrypoint node \
  -v "$PWD/.artifacts/lambda:/var/task:ro" \
  public.ecr.aws/lambda/nodejs:24 \
  -e 'require("./dist/lambda"); const a=require("argon2"); a.hash("artifact-self-check").then(h=>a.verify(h,"artifact-self-check")).then(ok=>{if(!ok)process.exit(1); console.log("Lambda handler and Argon2 loaded successfully")})'
