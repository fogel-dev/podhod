ALTER TABLE users ADD COLUMN login_normalized text;
UPDATE users SET login_normalized = 'legacy_' || substr(replace(id::text, '-', ''),1,24);
ALTER TABLE users ALTER COLUMN login_normalized SET NOT NULL;
ALTER TABLE users ADD CONSTRAINT users_login_format CHECK (login_normalized ~ '^[a-z][a-z0-9_]{2,31}$');
ALTER TABLE users ADD CONSTRAINT users_login_unique UNIQUE (login_normalized);
ALTER TABLE users DROP CONSTRAINT users_email_normalized_key;
ALTER TABLE users ALTER COLUMN email_normalized DROP NOT NULL;
ALTER TABLE users ADD COLUMN email_verified_at timestamptz;
ALTER TABLE users ADD CONSTRAINT users_verified_email CHECK (email_verified_at IS NULL OR email_normalized IS NOT NULL);
CREATE UNIQUE INDEX users_verified_email_unique ON users(email_normalized) WHERE email_verified_at IS NOT NULL;
DROP TABLE login_challenges;
CREATE TABLE password_credentials (
    user_id uuid PRIMARY KEY REFERENCES users(id),
    password_hash text NOT NULL,
    changed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sessions ADD COLUMN last_authenticated_at timestamptz NOT NULL DEFAULT now();
CREATE TABLE auth_rate_limits (
    key bytea NOT NULL,
    window_start timestamptz NOT NULL,
    attempts integer NOT NULL CHECK (attempts > 0),
    expires_at timestamptz NOT NULL,
    PRIMARY KEY(key, window_start)
);
CREATE INDEX auth_rate_limits_expiry ON auth_rate_limits(expires_at);
CREATE TABLE auth_events (
    id uuid PRIMARY KEY,
    user_id uuid REFERENCES users(id),
    action text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE ON password_credentials,auth_rate_limits TO podhod_api;
GRANT DELETE ON auth_rate_limits TO podhod_api;
GRANT INSERT ON auth_events TO podhod_api;
GRANT SELECT,DELETE ON password_credentials,auth_rate_limits,auth_events TO podhod_cleanup;
