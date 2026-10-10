package programs

import (
	"context"
	"github.com/fogel-dev/podhod/apps/api/internal/httpx"
	"github.com/jackc/pgx/v5"
	"regexp"
	"time"
)

type DB interface {
	Query(context.Context, string, ...any) (pgx.Rows, error)
	QueryRow(context.Context, string, ...any) pgx.Row
}
type Target struct {
	ID       string  `json:"id"`
	Position int     `json:"position"`
	WeightKg *string `json:"weightKg"`
	RepsMin  int     `json:"repsMin"`
	RepsMax  int     `json:"repsMax"`
}
type Exercise struct {
	ID           string   `json:"id"`
	ExerciseID   string   `json:"exerciseId"`
	Position     int      `json:"position"`
	Note         string   `json:"note"`
	Targets      []Target `json:"targets"`
	NameSnapshot string   `json:"nameSnapshot"`
}
type Day struct {
	Weekday   int        `json:"weekday"`
	Exercises []Exercise `json:"exercises"`
}
type InputExercise struct {
	ID         string   `json:"id"`
	ExerciseID string   `json:"exerciseId"`
	Position   int      `json:"position"`
	Note       string   `json:"note"`
	Targets    []Target `json:"targets"`
}
type InputDay struct {
	Weekday   int             `json:"weekday"`
	Exercises []InputExercise `json:"exercises"`
}
type Input struct {
	StartDate     string     `json:"startDate"`
	EndDate       string     `json:"endDate"`
	EffectiveFrom string     `json:"effectiveFrom"`
	Timezone      string     `json:"timezone"`
	Days          []InputDay `json:"days"`
}
type Revision struct {
	ID            string    `json:"id"`
	ProgramID     string    `json:"programId"`
	RevisionNo    int       `json:"revisionNo"`
	CreatedAt     time.Time `json:"createdAt"`
	StartDate     string    `json:"startDate"`
	EndDate       string    `json:"endDate"`
	EffectiveFrom string    `json:"effectiveFrom"`
	Timezone      string    `json:"timezone"`
	Days          []Day     `json:"days"`
}
type Exception struct {
	SourceDate string  `json:"sourceDate"`
	Action     string  `json:"action"`
	TargetDate *string `json:"targetDate"`
}
type Program struct {
	ID              string      `json:"id"`
	Version         int64       `json:"version"`
	CreatedAt       time.Time   `json:"createdAt"`
	UpdatedAt       time.Time   `json:"updatedAt"`
	Name            string      `json:"name"`
	CurrentRevision Revision    `json:"currentRevision"`
	ArchivedAt      *time.Time  `json:"archivedAt"`
	ArchivedFrom    *string     `json:"archivedFrom"`
	Exceptions      []Exception `json:"exceptions"`
}

var weightPattern = regexp.MustCompile(`^(0|[1-9][0-9]{0,4})\.[0-9]{2}$`)

func Weight(s string) bool { return weightPattern.MatchString(s) }
func Today(zone string) string {
	loc, err := time.LoadLocation(zone)
	if err != nil {
		return ""
	}
	return time.Now().In(loc).Format("2006-01-02")
}
func validate(in Input) error {
	start, e := httpx.Date(in.StartDate)
	if e != nil {
		return e
	}
	end, e := httpx.Date(in.EndDate)
	if e != nil {
		return e
	}
	effective, e := httpx.Date(in.EffectiveFrom)
	if e != nil {
		return e
	}
	if !httpx.Text(in.Timezone, 1, 100) || Today(in.Timezone) == "" || in.Timezone == "Local" || end.Before(start) || effective.Before(start) || effective.After(end) || in.EffectiveFrom < Today(in.Timezone) || len(in.Days) < 1 || len(in.Days) > 7 {
		return httpx.Fail(422, "invalid_revision")
	}
	days := map[int]bool{}
	ids := map[string]bool{}
	for _, d := range in.Days {
		if d.Weekday < 1 || d.Weekday > 7 || days[d.Weekday] || len(d.Exercises) < 1 || len(d.Exercises) > 100 {
			return httpx.Fail(422, "invalid_day")
		}
		days[d.Weekday] = true
		positions := map[int]bool{}
		for _, x := range d.Exercises {
			if !httpx.UUID(x.ID) || !httpx.UUID(x.ExerciseID) || ids[x.ID] || positions[x.Position] || x.Position < 1 || x.Position > 100 || !httpx.Text(x.Note, 0, 10000) || len(x.Targets) < 1 || len(x.Targets) > 100 {
				return httpx.Fail(422, "invalid_plan_exercise")
			}
			ids[x.ID] = true
			positions[x.Position] = true
			targets := map[int]bool{}
			for _, t := range x.Targets {
				if !httpx.UUID(t.ID) || ids[t.ID] || t.Position < 1 || t.Position > 100 || targets[t.Position] || t.RepsMin < 1 || t.RepsMax < t.RepsMin || t.RepsMax > 1000 || t.WeightKg != nil && !Weight(*t.WeightKg) {
					return httpx.Fail(422, "invalid_target")
				}
				ids[t.ID] = true
				targets[t.Position] = true
			}
		}
	}
	return nil
}
func LoadRevision(ctx context.Context, db DB, user, pid, rid string) (Revision, error) {
	var r Revision
	err := db.QueryRow(ctx, `SELECT id::text,program_id::text,revision_no,created_at,start_date::text,end_date::text,effective_from::text,timezone FROM program_revisions WHERE user_id=$1 AND program_id=$2 AND id=$3`, user, pid, rid).Scan(&r.ID, &r.ProgramID, &r.RevisionNo, &r.CreatedAt, &r.StartDate, &r.EndDate, &r.EffectiveFrom, &r.Timezone)
	if err != nil {
		return r, err
	}
	r.Days = []Day{}
	rows, err := db.Query(ctx, `SELECT d.weekday,e.id::text,e.exercise_id::text,e.position,e.name_snapshot,e.note,t.id::text,t.position,t.weight_kg::text,t.reps_min,t.reps_max FROM program_days d JOIN program_day_exercises e ON e.day_id=d.id AND e.revision_id=d.revision_id JOIN program_set_targets t ON t.day_exercise_id=e.id AND t.revision_id=e.revision_id WHERE d.user_id=$1 AND d.revision_id=$2 ORDER BY d.weekday,e.position,t.position`, user, rid)
	if err != nil {
		return r, err
	}
	defer rows.Close()
	for rows.Next() {
		var weekday int
		var x Exercise
		var target Target
		if err = rows.Scan(&weekday, &x.ID, &x.ExerciseID, &x.Position, &x.NameSnapshot, &x.Note, &target.ID, &target.Position, &target.WeightKg, &target.RepsMin, &target.RepsMax); err != nil {
			return r, err
		}
		if len(r.Days) == 0 || r.Days[len(r.Days)-1].Weekday != weekday {
			r.Days = append(r.Days, Day{weekday, []Exercise{}})
		}
		day := &r.Days[len(r.Days)-1]
		if len(day.Exercises) == 0 || day.Exercises[len(day.Exercises)-1].ID != x.ID {
			x.Targets = []Target{}
			day.Exercises = append(day.Exercises, x)
		}
		exercise := &day.Exercises[len(day.Exercises)-1]
		exercise.Targets = append(exercise.Targets, target)
	}
	return r, rows.Err()
}
func Load(ctx context.Context, db DB, user, pid string) (Program, error) {
	var p Program
	var rid string
	err := db.QueryRow(ctx, `SELECT id::text,version,created_at,updated_at,name,current_revision_id::text,archived_at,archived_from::text FROM programs WHERE user_id=$1 AND id=$2`, user, pid).Scan(&p.ID, &p.Version, &p.CreatedAt, &p.UpdatedAt, &p.Name, &rid, &p.ArchivedAt, &p.ArchivedFrom)
	if err != nil {
		return p, err
	}
	p.CurrentRevision, err = LoadRevision(ctx, db, user, pid, rid)
	if err != nil {
		return p, err
	}
	p.Exceptions = []Exception{}
	rows, err := db.Query(ctx, `SELECT source_date::text,action,target_date::text FROM schedule_exceptions WHERE user_id=$1 AND program_id=$2 ORDER BY source_date`, user, pid)
	if err != nil {
		return p, err
	}
	defer rows.Close()
	for rows.Next() {
		var x Exception
		if err = rows.Scan(&x.SourceDate, &x.Action, &x.TargetDate); err != nil {
			return p, err
		}
		p.Exceptions = append(p.Exceptions, x)
	}
	return p, rows.Err()
}
