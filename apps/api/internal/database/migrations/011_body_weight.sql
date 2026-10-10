CREATE TABLE body_weights (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_date date NOT NULL,
  weight_kg numeric(5,2) NOT NULL CHECK(weight_kg > 0 AND weight_kg <= 500),
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,local_date)
);
GRANT SELECT,INSERT,UPDATE ON body_weights TO podhod_api;
GRANT SELECT,DELETE ON body_weights TO podhod_cleanup;
