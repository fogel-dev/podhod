package workouts

import (
	"context"
	"encoding/json"
	"github.com/fogel-dev/podhod/apps/api/internal/httpx"
	"github.com/fogel-dev/podhod/apps/api/internal/programs"
)

func normalizeReplacement(ctx context.Context, db programs.DB, user string, value *Workout) error {
	old, err := LoadRevision(ctx, db, user, value.ID, value.CurrentRevision.ID)
	if err != nil {
		return err
	}
	parents := map[string]Exercise{}
	sets := map[string]Set{}
	for _, e := range old.Exercises {
		parents[e.ID] = e
		for _, s := range e.Sets {
			sets[s.ID] = s
		}
	}
	for i := range value.CurrentRevision.Exercises {
		e := &value.CurrentRevision.Exercises[i]
		previous, exists := parents[e.ID]
		if exists {
			if e.ExerciseID != previous.ExerciseID {
				return httpx.Fail(409, "exercise_identity_changed")
			}
			e.NameSnapshot = previous.NameSnapshot
			e.TechniqueSnapshot = previous.TechniqueSnapshot
		} else {
			var guide []byte
			if err = db.QueryRow(ctx, `SELECT name,(SELECT json_build_object('body',g.body,'sourceTitle',g.source_title,'sourceUrl',g.source_url,'reviewedAt',g.reviewed_at,'sourceAccessedAt',g.source_accessed_at) FROM technique_guides g WHERE g.exercise_id=x.id AND g.reviewed_at<=now()) FROM exercises x WHERE x.user_id=$1 AND x.id=$2 AND x.archived_at IS NULL`, user, e.ExerciseID).Scan(&e.NameSnapshot, &guide); err != nil {
				return err
			}
			e.TechniqueSnapshot = nil
			if len(guide) > 0 {
				if err = json.Unmarshal(guide, &e.TechniqueSnapshot); err != nil {
					return err
				}
			}
		}
		for _, s := range e.Sets {
			before, had := sets[s.ID]
			if !had {
				if s.Status != "pending" || s.StartedAt != nil {
					return httpx.Fail(409, "replacement_adds_fact")
				}
			} else {
				if s.Status != before.Status {
					return httpx.Fail(409, "replacement_changes_fact")
				}
				if before.Status == "completed" || before.StartedAt != nil {
					found := false
					for _, oldSet := range previous.Sets {
						if oldSet.ID == s.ID {
							found = true
						}
					}
					if !found {
						return httpx.Fail(409, "replacement_moves_fact")
					}
				}
				if before.StartedAt == nil && s.StartedAt != nil {
					return httpx.Fail(409, "replacement_changes_time")
				}
			}
		}
	}
	return nil
}
