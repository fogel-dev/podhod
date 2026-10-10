package workouts

import (
	"context"
	"encoding/json"
	"github.com/fogel-dev/podhod/apps/api/internal/httpx"
	"github.com/fogel-dev/podhod/apps/api/internal/programs"
	"github.com/jackc/pgx/v5"
)

func snapshots(ctx context.Context, db programs.DB, user string, input []programs.InputExercise) ([]Exercise, error) {
	if err := programs.ValidateExercises(input); err != nil {
		return nil, err
	}
	out := []Exercise{}
	for _, x := range input {
		e := Exercise{ID: x.ID, ExerciseID: x.ExerciseID, Position: x.Position, Note: x.Note, Sets: []Set{}}
		var guide []byte
		err := db.QueryRow(ctx, `SELECT name,(SELECT json_build_object('body',g.body,'sourceTitle',g.source_title,'sourceUrl',g.source_url,'reviewedAt',g.reviewed_at,'sourceAccessedAt',g.source_accessed_at) FROM technique_guides g WHERE g.exercise_id=e.id AND g.reviewed_at<=now()) FROM exercises e WHERE e.id=$1`, x.ExerciseID).Scan(&e.NameSnapshot, &guide)
		if err != nil {
			return nil, err
		}
		if len(guide) > 0 {
			if err = json.Unmarshal(guide, &e.TechniqueSnapshot); err != nil {
				return nil, err
			}
		}
		for _, t := range x.Targets {
			min, max := t.RepsMin, t.RepsMax
			e.Sets = append(e.Sets, Set{ID: t.ID, Position: t.Position, PlannedWeightKg: t.WeightKg, PlannedRepsMin: &min, PlannedRepsMax: &max, Status: "pending"})
		}
		out = append(out, e)
	}
	return out, nil
}
func store(ctx context.Context, tx pgx.Tx, user string, rev Revision, replace bool) error {
	if replace {
		for _, table := range []string{"rest_intervals", "workout_sets", "workout_exercises"} {
			if _, err := tx.Exec(ctx, `DELETE FROM `+table+` WHERE user_id=$1 AND revision_id=$2`, user, rev.ID); err != nil {
				return err
			}
		}
	}
	for _, e := range rev.Exercises {
		guide, _ := json.Marshal(e.TechniqueSnapshot)
		if _, err := tx.Exec(ctx, `INSERT INTO workout_exercises(id,user_id,revision_id,exercise_id,position,name_snapshot,note,technique_snapshot) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, e.ID, user, rev.ID, e.ExerciseID, e.Position, e.NameSnapshot, e.Note, guide); err != nil {
			return err
		}
		for _, s := range e.Sets {
			if _, err := tx.Exec(ctx, `INSERT INTO workout_sets(id,user_id,revision_id,workout_exercise_id,position,planned_weight_kg,planned_reps_min,planned_reps_max,status,actual_weight_kg,actual_reps,started_at,completed_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, s.ID, user, rev.ID, e.ID, s.Position, s.PlannedWeightKg, s.PlannedRepsMin, s.PlannedRepsMax, s.Status, s.ActualWeightKg, s.ActualReps, s.StartedAt, s.CompletedAt); err != nil {
				return err
			}
		}
	}
	for _, r := range rev.RestIntervals {
		if _, err := tx.Exec(ctx, `INSERT INTO rest_intervals(id,user_id,revision_id,after_set_id,started_at,ended_at,end_reason) VALUES($1,$2,$3,$4,$5,$6,$7)`, r.ID, user, rev.ID, r.AfterSetID, r.StartedAt, r.EndedAt, r.EndReason); err != nil {
			return err
		}
	}
	return nil
}
func bump(ctx context.Context, tx pgx.Tx, user string, w Workout, commandID, kind string, occurred any, payload any) error {
	encoded, _ := json.Marshal(payload)
	_, err := tx.Exec(ctx, `UPDATE workouts SET version=version+1,status=$3,started_at=$4,finished_at=$5,current_revision_id=$6,updated_at=now() WHERE user_id=$1 AND id=$2`, user, w.ID, w.Status, w.StartedAt, w.FinishedAt, w.CurrentRevision.ID)
	if err == nil {
		_, err = tx.Exec(ctx, `INSERT INTO workout_events(user_id,workout_id,command_id,type,occurred_at,payload) VALUES($1,$2,$3,$4,$5,$6)`, user, w.ID, commandID, kind, occurred, encoded)
	}
	if err == nil {
		err = httpx.Change(ctx, tx, user, "workout", w.ID, "upsert", w.Version+1)
	}
	return err
}
