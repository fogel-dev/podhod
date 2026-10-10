CREATE TABLE workouts (
 id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id),program_id uuid,program_revision_id uuid,scheduled_date date,
 local_date date NOT NULL,timezone text NOT NULL,status text NOT NULL CHECK(status IN ('active','completed','discarded')),
 started_at timestamptz NOT NULL,finished_at timestamptz,current_revision_id uuid NOT NULL,
 version bigint NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 9007199254740991),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,id),FOREIGN KEY(user_id,program_id,program_revision_id) REFERENCES program_revisions(user_id,program_id,id),
 CHECK((program_id IS NULL)=(program_revision_id IS NULL)),CHECK((program_id IS NULL)=(scheduled_date IS NULL)),
 CHECK(finished_at IS NULL OR finished_at>=started_at),CHECK((status='active')=(finished_at IS NULL))
);
CREATE UNIQUE INDEX one_active_workout ON workouts(user_id) WHERE status='active';
CREATE UNIQUE INDEX one_scheduled_workout ON workouts(user_id,program_id,scheduled_date) WHERE status<>'discarded' AND scheduled_date IS NOT NULL;
CREATE INDEX workouts_dates ON workouts(user_id,local_date,id);
CREATE TABLE workout_revisions (
 id uuid PRIMARY KEY,user_id uuid NOT NULL,workout_id uuid NOT NULL,revision_no integer NOT NULL CHECK(revision_no>0),reason text CHECK(length(reason)<=10000),
 started_at timestamptz NOT NULL,finished_at timestamptz,sealed boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,id),UNIQUE(workout_id,revision_no),UNIQUE(user_id,workout_id,id),
 FOREIGN KEY(user_id,workout_id) REFERENCES workouts(user_id,id),CHECK(finished_at IS NULL OR finished_at>=started_at)
);
ALTER TABLE workouts ADD FOREIGN KEY(user_id,id,current_revision_id) REFERENCES workout_revisions(user_id,workout_id,id) DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE workout_exercises (
 id uuid NOT NULL,user_id uuid NOT NULL,revision_id uuid NOT NULL,exercise_id uuid NOT NULL,position integer NOT NULL CHECK(position BETWEEN 1 AND 100),
 name_snapshot text NOT NULL CHECK(length(name_snapshot) BETWEEN 1 AND 120),note text NOT NULL CHECK(length(note)<=10000),technique_snapshot jsonb,
 PRIMARY KEY(revision_id,id),UNIQUE(user_id,revision_id,id),UNIQUE(revision_id,position),
 FOREIGN KEY(user_id,revision_id) REFERENCES workout_revisions(user_id,id),FOREIGN KEY(user_id,exercise_id) REFERENCES exercises(user_id,id)
);
CREATE TABLE workout_sets (
 id uuid NOT NULL,user_id uuid NOT NULL,revision_id uuid NOT NULL,workout_exercise_id uuid NOT NULL,position integer NOT NULL CHECK(position BETWEEN 1 AND 100),
 planned_weight_kg numeric(7,2) CHECK(planned_weight_kg>=0),planned_reps_min integer,planned_reps_max integer,
 status text NOT NULL CHECK(status IN ('pending','completed','skipped')),actual_weight_kg numeric(7,2),actual_reps integer,started_at timestamptz,completed_at timestamptz,
 PRIMARY KEY(revision_id,id),UNIQUE(user_id,revision_id,id),UNIQUE(revision_id,workout_exercise_id,position),
 FOREIGN KEY(user_id,revision_id,workout_exercise_id) REFERENCES workout_exercises(user_id,revision_id,id),
 CHECK((planned_reps_min IS NULL AND planned_reps_max IS NULL) OR (planned_reps_min BETWEEN 1 AND 1000 AND planned_reps_max BETWEEN planned_reps_min AND 1000)),
 CHECK((status='completed' AND actual_weight_kg>=0 AND actual_weight_kg IS NOT NULL AND actual_reps BETWEEN 1 AND 1000 AND completed_at IS NOT NULL)
 OR (status<>'completed' AND actual_weight_kg IS NULL AND actual_reps IS NULL AND completed_at IS NULL)),
 CHECK(started_at IS NULL OR completed_at IS NULL OR completed_at>=started_at)
);
CREATE TABLE rest_intervals (
 id uuid NOT NULL,user_id uuid NOT NULL,revision_id uuid NOT NULL,after_set_id uuid NOT NULL,started_at timestamptz NOT NULL,ended_at timestamptz,end_reason text,
 PRIMARY KEY(revision_id,id),UNIQUE(revision_id,after_set_id),
 FOREIGN KEY(user_id,revision_id,after_set_id) REFERENCES workout_sets(user_id,revision_id,id),
 CHECK(ended_at IS NULL OR ended_at>=started_at),CHECK((ended_at IS NULL AND end_reason IS NULL) OR (ended_at IS NOT NULL AND end_reason IN ('next_set','finish','correction')))
);
CREATE UNIQUE INDEX one_open_rest ON rest_intervals(revision_id) WHERE ended_at IS NULL;
CREATE TABLE workout_events (
 user_id uuid NOT NULL,workout_id uuid NOT NULL,command_id uuid NOT NULL,type text NOT NULL,occurred_at timestamptz NOT NULL,received_at timestamptz NOT NULL DEFAULT now(),payload jsonb NOT NULL,
 PRIMARY KEY(user_id,command_id),FOREIGN KEY(user_id,workout_id) REFERENCES workouts(user_id,id)
);
CREATE FUNCTION guard_workout_revision() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE rid uuid;
BEGIN
 IF TG_OP='DELETE' AND current_user='podhod_cleanup' THEN RETURN OLD; END IF;
 IF TG_TABLE_NAME='workout_revisions' THEN
  IF OLD.sealed THEN RAISE EXCEPTION 'sealed workout immutable'; END IF;
 ELSE
  IF TG_OP='DELETE' THEN rid:=OLD.revision_id; ELSE rid:=NEW.revision_id; END IF;
  IF EXISTS(SELECT 1 FROM workout_revisions WHERE id=rid AND sealed) THEN RAISE EXCEPTION 'sealed workout immutable'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;RETURN NEW;
END $$;
CREATE TRIGGER immutable_workout_revision BEFORE UPDATE OR DELETE ON workout_revisions FOR EACH ROW EXECUTE FUNCTION guard_workout_revision();
CREATE TRIGGER immutable_workout_exercises BEFORE INSERT OR UPDATE OR DELETE ON workout_exercises FOR EACH ROW EXECUTE FUNCTION guard_workout_revision();
CREATE TRIGGER immutable_workout_sets BEFORE INSERT OR UPDATE OR DELETE ON workout_sets FOR EACH ROW EXECUTE FUNCTION guard_workout_revision();
CREATE TRIGGER immutable_workout_rest BEFORE INSERT OR UPDATE OR DELETE ON rest_intervals FOR EACH ROW EXECUTE FUNCTION guard_workout_revision();
GRANT SELECT,INSERT,UPDATE ON workouts,workout_revisions TO podhod_api;
GRANT SELECT,INSERT,UPDATE,DELETE ON workout_exercises,workout_sets,rest_intervals TO podhod_api;
GRANT SELECT,INSERT ON workout_events TO podhod_api;
GRANT SELECT,DELETE ON workouts,workout_revisions,workout_exercises,workout_sets,rest_intervals,workout_events TO podhod_cleanup;
CREATE FUNCTION guard_started_schedule() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p uuid; d date; u uuid;
BEGIN
 IF TG_OP='DELETE' AND current_user='podhod_cleanup' THEN RETURN OLD; END IF;
 IF TG_OP='DELETE' THEN p:=OLD.program_id;d:=OLD.source_date;u:=OLD.user_id; ELSE p:=NEW.program_id;d:=NEW.source_date;u:=NEW.user_id; END IF;
 IF EXISTS(SELECT 1 FROM workouts WHERE user_id=u AND program_id=p AND scheduled_date=d AND status<>'discarded') THEN RAISE EXCEPTION 'started occurrence immutable' USING ERRCODE='23505'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;RETURN NEW;
END $$;
CREATE TRIGGER started_schedule BEFORE INSERT OR UPDATE OR DELETE ON schedule_exceptions FOR EACH ROW EXECUTE FUNCTION guard_started_schedule();
