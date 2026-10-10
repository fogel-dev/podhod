CREATE TABLE day_notes (
 id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id),local_date date NOT NULL,body text NOT NULL CHECK(length(body)<=10000),
 version bigint NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 9007199254740991),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),deleted_at timestamptz,
 UNIQUE(user_id,local_date),UNIQUE(user_id,id)
);
-- Calendar/day are real consumers of photo metadata; byte upload/processing follows in EGO-30.
CREATE TABLE photos (
 id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id),local_date date NOT NULL,workout_id uuid,
 status text NOT NULL CHECK(status IN ('pending','processing','ready','failed','deleting')),
 size_bytes bigint NOT NULL CHECK(size_bytes BETWEEN 1 AND 10485760),stored_bytes bigint NOT NULL DEFAULT 0 CHECK(stored_bytes>=0),
 mime_type text NOT NULL CHECK(mime_type IN ('image/jpeg','image/png','image/webp')),checksum_sha256 text NOT NULL CHECK(checksum_sha256 ~ '^[a-f0-9]{64}$'),
 staging_key text NOT NULL, image_key text,thumbnail_key text,upload_expires_at timestamptz NOT NULL,
 width integer CHECK(width>0),height integer CHECK(height>0),position integer NOT NULL CHECK(position BETWEEN 1 AND 20),error_code text CHECK(length(error_code)<=100),
 version bigint NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 9007199254740991),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),deleted_at timestamptz,
 UNIQUE(user_id,id),FOREIGN KEY(user_id,workout_id) REFERENCES workouts(user_id,id),
 CHECK(status<>'ready' OR (image_key IS NOT NULL AND thumbnail_key IS NOT NULL AND width IS NOT NULL AND height IS NOT NULL))
);
CREATE INDEX photos_day ON photos(user_id,local_date,position,id) WHERE deleted_at IS NULL;
GRANT SELECT,INSERT,UPDATE ON day_notes TO podhod_api;
GRANT SELECT ON photos TO podhod_api;
GRANT SELECT,DELETE ON day_notes,photos TO podhod_cleanup;
