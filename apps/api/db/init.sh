#!/bin/sh
set -eu
api_password=$(cat /run/secrets/db_api_password)
worker_password=$(cat /run/secrets/db_worker_password)
migration_password=$(cat /run/secrets/db_migration_password)
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -v ON_ERROR_STOP=1 \
  -v api_password="$api_password" -v worker_password="$worker_password" \
  -v migration_password="$migration_password" <<'SQL'
CREATE ROLE podhod_api NOLOGIN;
CREATE ROLE podhod_worker NOLOGIN;
CREATE ROLE podhod_cleanup NOLOGIN;
CREATE ROLE podhod_migrator NOLOGIN;
CREATE ROLE api_login LOGIN PASSWORD :'api_password';
GRANT podhod_api TO api_login;
CREATE ROLE worker_login LOGIN PASSWORD :'worker_password';
GRANT podhod_worker TO worker_login;
CREATE ROLE migration_login LOGIN PASSWORD :'migration_password';
GRANT podhod_migrator TO migration_login;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA podhod AUTHORIZATION podhod_migrator;
GRANT USAGE ON SCHEMA podhod TO podhod_api, podhod_worker, podhod_cleanup;
SQL
