CREATE TABLE programs (
 id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id),name text NOT NULL CHECK(length(name) BETWEEN 1 AND 120),
 current_revision_id uuid NOT NULL,archived_at timestamptz,archived_from date,
 version bigint NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 9007199254740991),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,id),
 CHECK((archived_at IS NULL)=(archived_from IS NULL))
);
CREATE TABLE program_revisions (
 id uuid PRIMARY KEY,user_id uuid NOT NULL,program_id uuid NOT NULL,revision_no integer NOT NULL CHECK(revision_no>0),
 start_date date NOT NULL,end_date date NOT NULL,effective_from date NOT NULL,timezone text NOT NULL,
 sealed boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,id),UNIQUE(program_id,revision_no),UNIQUE(user_id,program_id,id),
 FOREIGN KEY(user_id,program_id) REFERENCES programs(user_id,id),
 CHECK(start_date<=effective_from AND effective_from<=end_date)
);
ALTER TABLE programs ADD FOREIGN KEY(user_id,id,current_revision_id) REFERENCES program_revisions(user_id,program_id,id) DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE program_days (
 id uuid PRIMARY KEY,user_id uuid NOT NULL,revision_id uuid NOT NULL,weekday smallint NOT NULL CHECK(weekday BETWEEN 1 AND 7),
 UNIQUE(revision_id,weekday),UNIQUE(user_id,revision_id,id),
 FOREIGN KEY(user_id,revision_id) REFERENCES program_revisions(user_id,id)
);
CREATE TABLE program_day_exercises (
 id uuid NOT NULL,user_id uuid NOT NULL,revision_id uuid NOT NULL,day_id uuid NOT NULL,exercise_id uuid NOT NULL,
 position integer NOT NULL CHECK(position BETWEEN 1 AND 100),name_snapshot text NOT NULL CHECK(length(name_snapshot) BETWEEN 1 AND 120),note text NOT NULL CHECK(length(note)<=10000),
 PRIMARY KEY(revision_id,id),UNIQUE(user_id,revision_id,id),UNIQUE(day_id,position),
 FOREIGN KEY(user_id,revision_id,day_id) REFERENCES program_days(user_id,revision_id,id),
 FOREIGN KEY(user_id,exercise_id) REFERENCES exercises(user_id,id)
);
CREATE TABLE program_set_targets (
 id uuid NOT NULL,user_id uuid NOT NULL,revision_id uuid NOT NULL,day_exercise_id uuid NOT NULL,position integer NOT NULL CHECK(position BETWEEN 1 AND 100),
 weight_kg numeric(7,2) CHECK(weight_kg>=0),reps_min integer NOT NULL,reps_max integer NOT NULL,
 PRIMARY KEY(revision_id,id),UNIQUE(revision_id,day_exercise_id,position),
 FOREIGN KEY(user_id,revision_id,day_exercise_id) REFERENCES program_day_exercises(user_id,revision_id,id),
 CHECK(reps_min BETWEEN 1 AND 1000 AND reps_max BETWEEN reps_min AND 1000)
);
CREATE TABLE schedule_exceptions (
 user_id uuid NOT NULL,program_id uuid NOT NULL,source_date date NOT NULL,target_date date,action text NOT NULL CHECK(action IN ('cancel','move')),
 PRIMARY KEY(program_id,source_date),FOREIGN KEY(user_id,program_id) REFERENCES programs(user_id,id),
 CHECK((action='cancel' AND target_date IS NULL) OR (action='move' AND target_date IS NOT NULL AND source_date<>target_date))
);
CREATE UNIQUE INDEX exception_targets ON schedule_exceptions(user_id,target_date) WHERE target_date IS NOT NULL;
CREATE FUNCTION guard_program_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='program_revisions' THEN
  IF OLD.sealed THEN RAISE EXCEPTION 'published revision immutable'; END IF;
 ELSE
  IF EXISTS(SELECT 1 FROM program_revisions WHERE id=NEW.revision_id AND sealed) THEN RAISE EXCEPTION 'published revision immutable'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_program_revision BEFORE UPDATE ON program_revisions FOR EACH ROW EXECUTE FUNCTION guard_program_revision();
CREATE TRIGGER immutable_program_days BEFORE INSERT OR UPDATE ON program_days FOR EACH ROW EXECUTE FUNCTION guard_program_revision();
CREATE TRIGGER immutable_program_exercises BEFORE INSERT OR UPDATE ON program_day_exercises FOR EACH ROW EXECUTE FUNCTION guard_program_revision();
CREATE TRIGGER immutable_program_targets BEFORE INSERT OR UPDATE ON program_set_targets FOR EACH ROW EXECUTE FUNCTION guard_program_revision();
GRANT SELECT,INSERT,UPDATE ON programs TO podhod_api;
GRANT SELECT,INSERT ON program_revisions,program_days,program_day_exercises,program_set_targets TO podhod_api;
GRANT UPDATE(sealed) ON program_revisions TO podhod_api;
GRANT SELECT,INSERT,UPDATE,DELETE ON schedule_exceptions TO podhod_api;
GRANT SELECT,DELETE ON programs,program_revisions,program_days,program_day_exercises,program_set_targets,schedule_exceptions TO podhod_cleanup;
