#!/usr/bin/env sh
set -eu

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

npm install
npm run db:generate
npm run db:deploy || npm run db:migrate -- --name init
npm run db:seed

echo "Setup complete. Run: npm run dev"
