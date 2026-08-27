#!/usr/bin/env bash
#
# Applique les migrations sur une base PostgreSQL locale, puis exécute les
# tests d'isolation (RLS, contraintes, fonctions transactionnelles).
#
#   PGHOST=localhost PGPORT=5432 PGUSER=postgres ./scripts/test-db.sh
#
# N'a PAS besoin d'un projet Supabase : `supabase/tests/00_supabase_shim.sql`
# recrée le strict minimum (schéma auth, auth.uid(), rôles).
set -euo pipefail

DB="${TEST_DB:-patrimoine_test}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "── Recréation de la base $DB"
psql -q -d postgres -c "drop database if exists $DB"
psql -q -d postgres -c "create database $DB"

echo "── Application des migrations"
for file in "$ROOT"/supabase/tests/00_supabase_shim.sql \
            "$ROOT"/supabase/migrations/*.sql \
            "$ROOT"/supabase/tests/01_grants.sql; do
  printf '   %s\n' "$(basename "$file")"
  psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$file" 2>&1 | grep -v '^psql:.*NOTICE' || true
done

echo "── Tests de sécurité"
# Les NOTICE de PostgreSQL passent par stderr : il faut les fusionner.
psql -v ON_ERROR_STOP=1 -d "$DB" -f "$ROOT/supabase/tests/02_security.sql" 2>&1 \
  | grep -vE '^(SET|INSERT 0|RESET|DO|UPDATE|DELETE)' \
  | sed 's|psql:.*02_security.sql:[0-9]*: ||'

echo
echo "✓ Terminé. Chaque ligne « OK : … » est une opération interdite qui a bien échoué."
