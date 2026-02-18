#!/bin/sh
set -e

# Run database migrations before starting the app
echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting Next.js..."
exec "$@"
