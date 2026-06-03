# Lambda — Question Ingestion (AWS, Not Active)

This folder contains a `question-ingestion` AWS Lambda function that triggers on S3 PUT events,
reads a JSON question file, and inserts questions into the PostgreSQL database.

## Status: Standalone / Not Wired into CI-CD

This Lambda is **not built or deployed by the current GitHub Actions pipeline**, and there is
**no Terraform module** for it in `infrastructure/`. It was written as a bulk-import utility
for seeding questions from S3.

## Why It's Here

The primary deployment is on OCI (OKE). The Lambda is an AWS-native alternative for question
ingestion that was prototyped but not promoted to the main pipeline.

## To Use Manually

```bash
cd question-ingestion
npm install

# Zip and deploy to AWS manually
zip -r function.zip index.js node_modules/
aws lambda create-function \
  --function-name gnosis-question-ingestion \
  --runtime nodejs18.x \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --environment Variables="{DB_HOST=...,DB_PORT=5432,DB_NAME=gnosis,DB_USER=postgres,DB_PASSWORD=...}" \
  --role arn:aws:iam::<account>:role/lambda-execution-role
```

## To Remove

If this is no longer needed, delete this folder and remove the reference from architecture docs.
