// Package media stores private photo metadata; storage keys never enter public DTOs.
package media

import (
	"context"
	"github.com/fogel-dev/podhod/apps/api/internal/programs"
	"github.com/jackc/pgx/v5"
	"time"
)

type Photo struct {
	ID        string    `json:"id"`
	Version   int64     `json:"version"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	LocalDate string    `json:"localDate"`
	WorkoutID *string   `json:"workoutId"`
	Status    string    `json:"status"`
	SizeBytes int64     `json:"sizeBytes"`
	Width     *int      `json:"width"`
	Height    *int      `json:"height"`
	Position  int       `json:"position"`
	ErrorCode *string   `json:"errorCode"`
}
type Page struct {
	Items      []Photo `json:"items"`
	NextCursor *string `json:"nextCursor"`
}

const Columns = `id::text,version,created_at,updated_at,local_date::text,workout_id::text,status,size_bytes,width,height,position,error_code`

func Scan(row pgx.Row) (Photo, error) {
	var p Photo
	err := row.Scan(&p.ID, &p.Version, &p.CreatedAt, &p.UpdatedAt, &p.LocalDate, &p.WorkoutID, &p.Status, &p.SizeBytes, &p.Width, &p.Height, &p.Position, &p.ErrorCode)
	return p, err
}
func Day(ctx context.Context, db programs.DB, user, date string) (Page, error) {
	rows, err := db.Query(ctx, `SELECT `+Columns+` FROM photos WHERE user_id=$1 AND local_date=$2::date AND deleted_at IS NULL ORDER BY position,id LIMIT 20`, user, date)
	if err != nil {
		return Page{}, err
	}
	defer rows.Close()
	page := Page{Items: []Photo{}}
	for rows.Next() {
		p, err := Scan(rows)
		if err != nil {
			return page, err
		}
		page.Items = append(page.Items, p)
	}
	return page, rows.Err()
}
