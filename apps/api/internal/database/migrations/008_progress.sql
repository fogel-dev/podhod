CREATE INDEX workout_exercises_progress ON workout_exercises(user_id,exercise_id,revision_id);
CREATE INDEX completed_workouts_dates ON workouts(user_id,local_date,started_at,id) WHERE status='completed';
