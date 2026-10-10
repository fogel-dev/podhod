CREATE TABLE exercises (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id),
 name text NOT NULL CHECK(length(name) BETWEEN 1 AND 120), normalized_name text NOT NULL,
 note text NOT NULL DEFAULT '' CHECK(length(note)<=10000), archived_at timestamptz,
 version bigint NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 9007199254740991),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,id)
);
CREATE INDEX exercises_name ON exercises(user_id,normalized_name);
CREATE TABLE technique_guides (
 exercise_id uuid PRIMARY KEY REFERENCES exercises(id), body text NOT NULL CHECK(length(body) BETWEEN 1 AND 10000),
 source_title text NOT NULL CHECK(length(source_title) BETWEEN 1 AND 120),
 source_url text NOT NULL CHECK(source_url ~ '^https://' AND length(source_url)<=4096),
 reviewed_at timestamptz NOT NULL, source_accessed_at timestamptz NOT NULL,
 CHECK(source_accessed_at<=reviewed_at)
);
GRANT SELECT,INSERT,UPDATE ON exercises TO podhod_api;
GRANT SELECT ON technique_guides TO podhod_api;
GRANT SELECT,DELETE ON exercises,technique_guides TO podhod_cleanup;
