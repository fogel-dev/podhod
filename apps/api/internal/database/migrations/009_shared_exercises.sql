-- Library identities are shared; programs and workout records remain user-owned.
ALTER TABLE program_day_exercises DROP CONSTRAINT program_day_exercises_user_id_exercise_id_fkey;
ALTER TABLE program_day_exercises ADD FOREIGN KEY(exercise_id) REFERENCES exercises(id);
ALTER TABLE workout_exercises DROP CONSTRAINT workout_exercises_user_id_exercise_id_fkey;
ALTER TABLE workout_exercises ADD FOREIGN KEY(exercise_id) REFERENCES exercises(id);
CREATE INDEX exercises_shared_name ON exercises(normalized_name,id);
