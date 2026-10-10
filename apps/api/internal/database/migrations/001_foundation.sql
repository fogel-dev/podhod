CREATE TABLE users (
    id uuid PRIMARY KEY,
    email_normalized text NOT NULL UNIQUE CHECK (length(email_normalized) BETWEEN 3 AND 254),
    timezone text NOT NULL DEFAULT 'UTC',
    locale text NOT NULL DEFAULT 'ru',
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleting')),
    deletion_requested_at timestamptz,
    version bigint NOT NULL DEFAULT 1 CHECK (version BETWEEN 1 AND 9007199254740991),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE devices (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id),
    label text NOT NULL CHECK (length(label) BETWEEN 1 AND 120),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    revoked_at timestamptz,
    version bigint NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, id)
);
CREATE INDEX devices_user ON devices(user_id);

CREATE TABLE login_challenges (
    id uuid PRIMARY KEY,
    user_id uuid REFERENCES users(id),
    email_normalized text NOT NULL,
    purpose text NOT NULL CHECK (purpose IN ('login', 'delete_account')),
    code_hmac bytea NOT NULL,
    request_ip_hash bytea NOT NULL,
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (purpose = 'login' OR user_id IS NOT NULL),
    CHECK (expires_at > created_at)
);
CREATE INDEX challenges_email ON login_challenges(email_normalized, created_at DESC);
CREATE INDEX challenges_ip ON login_challenges(request_ip_hash, created_at DESC);

CREATE TABLE sessions (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id),
    device_id uuid NOT NULL,
    token_hash bytea NOT NULL UNIQUE,
    csrf_hash bytea NOT NULL,
    expires_at timestamptz NOT NULL,
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (user_id, device_id) REFERENCES devices(user_id, id),
    CHECK (expires_at > created_at)
);
CREATE INDEX sessions_user_device ON sessions(user_id, device_id);

CREATE TABLE sync_heads (
    user_id uuid PRIMARY KEY REFERENCES users(id),
    seq bigint NOT NULL DEFAULT 0 CHECK (seq >= 0)
);
CREATE TABLE command_receipts (
    user_id uuid NOT NULL,
    command_id uuid NOT NULL,
    device_id uuid NOT NULL,
    payload_hash bytea NOT NULL,
    result jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, command_id),
    FOREIGN KEY (user_id, device_id) REFERENCES devices(user_id, id)
);
CREATE INDEX receipts_created ON command_receipts(created_at);
CREATE TABLE change_log (
    user_id uuid NOT NULL REFERENCES users(id),
    seq bigint NOT NULL CHECK (seq > 0),
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    operation text NOT NULL CHECK (operation IN ('upsert', 'delete')),
    entity_version bigint NOT NULL CHECK (entity_version >= 1),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, seq)
);
CREATE INDEX change_log_created ON change_log(created_at);

CREATE TABLE jobs (
    id uuid PRIMARY KEY,
    user_id uuid REFERENCES users(id),
    kind text NOT NULL,
    payload bytea,
    dedupe_key text NOT NULL UNIQUE,
    available_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz,
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    lease_until timestamptz,
    lease_token uuid,
    state text NOT NULL DEFAULT 'ready' CHECK (state IN ('ready', 'running', 'done', 'dead')),
    last_error_code text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK ((state = 'running' AND lease_until IS NOT NULL AND lease_token IS NOT NULL)
        OR (state <> 'running' AND lease_until IS NULL AND lease_token IS NULL))
);
CREATE INDEX jobs_ready ON jobs(available_at, id) WHERE state = 'ready';
CREATE INDEX jobs_lease ON jobs(lease_until) WHERE state = 'running';

GRANT SELECT, INSERT, UPDATE ON users, devices, login_challenges, sessions,
    sync_heads, command_receipts, change_log TO podhod_api;
GRANT INSERT ON jobs TO podhod_api;
GRANT SELECT, UPDATE ON jobs TO podhod_worker;
GRANT SELECT ON schema_migrations TO podhod_api, podhod_worker;
GRANT SELECT, DELETE ON ALL TABLES IN SCHEMA podhod TO podhod_cleanup;
