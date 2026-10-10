ALTER TABLE workouts
 ADD COLUMN cardio_activity text,
 ADD COLUMN cardio_minutes integer,
 ADD CONSTRAINT valid_workout_cardio CHECK (
  (cardio_activity IS NULL AND cardio_minutes IS NULL) OR
  (cardio_activity IS NOT NULL AND length(btrim(cardio_activity)) BETWEEN 1 AND 120
   AND cardio_minutes IS NOT NULL AND cardio_minutes BETWEEN 1 AND 1440)
 );

CREATE FUNCTION guard_workout_cardio() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status <> 'active' AND
  (NEW.cardio_activity IS DISTINCT FROM OLD.cardio_activity OR NEW.cardio_minutes IS DISTINCT FROM OLD.cardio_minutes)
 THEN RAISE EXCEPTION 'completed workout cardio immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_workout_cardio BEFORE UPDATE ON workouts
 FOR EACH ROW EXECUTE FUNCTION guard_workout_cardio();
