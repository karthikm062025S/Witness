#!/usr/bin/env bash
set -e

echo "=== WITNESS Backend Build ==="
mkdir -p dist dist/zips

ESBUILD=./src/backend/node_modules/.bin/esbuild
FLAGS="--bundle --platform=node --target=node22 --format=cjs --external:@aws-sdk/*"

for LAMBDA in get-upload-url orchestrator stage1-vision stage2-matching stage3-complaint send-complaint; do
  $ESBUILD src/backend/lambdas/$LAMBDA.ts $FLAGS --outfile=dist/$LAMBDA.js
  echo "  [ok] bundled $LAMBDA"
done

cd dist
for LAMBDA in get-upload-url orchestrator stage1-vision stage2-matching stage3-complaint send-complaint; do
  zip zips/$LAMBDA.zip $LAMBDA.js
  echo "  [ok] zipped $LAMBDA"
done
cd ..

echo "=== Build complete: dist/zips/*.zip ==="
