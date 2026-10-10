-- Run once as database administrator, before cmd/migrate. No product data.
DO $$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'podhod_migrator') THEN
        CREATE ROLE podhod_migrator NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'podhod_api') THEN
        CREATE ROLE podhod_api NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'podhod_worker') THEN
        CREATE ROLE podhod_worker NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'podhod_cleanup') THEN
        CREATE ROLE podhod_cleanup NOLOGIN;
    END IF;
END $$;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA IF NOT EXISTS podhod AUTHORIZATION podhod_migrator;
GRANT USAGE ON SCHEMA podhod TO podhod_api, podhod_worker, podhod_cleanup;
