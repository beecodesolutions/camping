#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Clear generated output so removed files cannot survive a repeated export.
rm -rf .artifacts/lambda
# Production dependencies are installed in Linux; no host node_modules copied.
docker build --platform linux/amd64 -f Dockerfile.lambda --output type=local,dest=.artifacts/lambda .
# Preserve pnpm links: CloudFormation directory packaging dereferences them,
# which changes Node dependency resolution after deployment.
rm -f .artifacts/lambda.zip
(cd .artifacts/lambda && zip -qry ../lambda.zip .)
# Verify the exact zip payload, not only the pre-archive directory.
rm -rf .artifacts/lambda-check
unzip -q .artifacts/lambda.zip -d .artifacts/lambda-check
# Load handler and native password library on the exact Lambda runtime image.
docker run --rm --platform linux/amd64 --entrypoint node \
  -v "$PWD/.artifacts/lambda-check:/var/task:ro" \
  public.ecr.aws/lambda/nodejs:24 \
  -e 'const {handler}=require("./dist/lambda"); if(handler.length>2)throw new Error("Node 24 rejects callback handlers"); const a=require("argon2"); a.hash("artifact-self-check").then(h=>a.verify(h,"artifact-self-check")).then(ok=>{if(!ok)process.exit(1); console.log("Lambda handler and Argon2 loaded successfully")})'
