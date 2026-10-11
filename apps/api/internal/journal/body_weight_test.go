package journal

import (
	"context"
	"github.com/fogel-dev/podhod/apps/api/internal/domaintest"
	"github.com/fogel-dev/podhod/apps/api/internal/id"
	"github.com/fogel-dev/podhod/apps/api/internal/programs"
	"testing"
	"time"
)

func TestBodyWeightValidation(t *testing.T) {
	for _, value := range []string{"0", "-1", "501", "NaN", "80.123", "80,2", ""} {
		if validWeight(value) {
			t.Fatal(value)
		}
	}
	for _, value := range []string{"0.01", "80", "80.25", "500.00"} {
		if !validWeight(value) {
			t.Fatal(value)
		}
	}
}
func TestBodyWeightPrivacyDatesVersionsAndHistory(t *testing.T) {
	app := domaintest.New(t)
	(&Service{Core: app.Core, Auth: app.Auth}).RegisterRoutes(app.Mux)
	a, b := app.User(t, "first"), app.User(t, "second")
	date := programs.Today(a.Session.User.Timezone)
	path := "/api/v1/days/" + date + "/body-weight"
	key := id.New()
	body := map[string]any{"weightKg": "80.25"}
	domaintest.Status(t, app.Request(a, "PUT", path, body, key, `"0"`), 200)
	domaintest.Status(t, app.Request(a, "PUT", path, body, key, `"0"`), 200)
	domaintest.Status(t, app.Write(a, "PUT", path, body, 0), 409)
	domaintest.Status(t, app.Write(a, "PUT", path, map[string]any{"weightKg": "81"}, 1), 200)
	domaintest.Status(t, app.Write(a, "PUT", path, map[string]any{"weightKg": "0"}, 2), 422)
	var day Day
	domaintest.Decode(t, app.Request(a, "GET", "/api/v1/days/"+date, nil, "", ""), &day)
	if day.BodyWeight == nil || day.BodyWeight.WeightKg != "81.00" || day.BodyWeight.Version != 2 {
		t.Fatal(day.BodyWeight)
	}
	domaintest.Decode(t, app.Request(b, "GET", "/api/v1/days/"+date, nil, "", ""), &day)
	if day.BodyWeight != nil {
		t.Fatal("foreign weight leaked")
	}
	yesterday, _ := time.Parse("2006-01-02", date)
	yesterday = yesterday.AddDate(0, 0, -1)
	old := yesterday.Format("2006-01-02")
	future := yesterday.AddDate(0, 0, 2).Format("2006-01-02")
	for _, otherDate := range []string{old, future} {
		domaintest.Status(t, app.Write(a, "PUT", "/api/v1/days/"+otherDate+"/body-weight", body, 0), 422)
	}
	if _, err := app.Core.Pool.Exec(context.Background(), `UPDATE body_weights SET local_date=$2 WHERE user_id=$1`, a.Session.User.ID, old); err != nil {
		t.Fatal(err)
	}
	domaintest.Status(t, app.Write(a, "PUT", "/api/v1/days/"+old+"/body-weight", body, 2), 422)
	domaintest.Decode(t, app.Request(a, "GET", "/api/v1/days/"+old, nil, "", ""), &day)
	if day.BodyWeight == nil || day.BodyWeight.WeightKg != "81.00" {
		t.Fatal("past day missing weight")
	}
	domaintest.Status(t, app.Write(a, "PUT", path, map[string]any{"weightKg": "80.5"}, 0), 200)
	var history struct {
		Items []BodyWeight `json:"items"`
	}
	historyPath := "/api/v1/body-weight?from=" + old + "&to=" + date
	domaintest.Decode(t, app.Request(a, "GET", historyPath, nil, "", ""), &history)
	if len(history.Items) != 2 || history.Items[0].LocalDate != old || history.Items[0].WeightKg != "81.00" || history.Items[1].WeightKg != "80.50" {
		t.Fatal(history)
	}
	domaintest.Decode(t, app.Request(b, "GET", historyPath, nil, "", ""), &history)
	if len(history.Items) != 0 {
		t.Fatal("foreign history leaked")
	}
	domaintest.Status(t, app.Request(a, "GET", "/api/v1/body-weight?from=2024-01-01&to=2026-10-10", nil, "", ""), 422)
}

func TestBodyWeightUsesUserTimezone(t *testing.T) {
	app := domaintest.New(t)
	(&Service{Core: app.Core, Auth: app.Auth}).RegisterRoutes(app.Mux)
	a := app.User(t, "zoned")
	for _, zone := range []string{"Etc/GMT+12", "Pacific/Kiritimati"} {
		if _, err := app.Core.Pool.Exec(context.Background(), `UPDATE users SET timezone=$2 WHERE id=$1`, a.Session.User.ID, zone); err != nil {
			t.Fatal(err)
		}
		date := programs.Today(zone)
		domaintest.Status(t, app.Write(a, "PUT", "/api/v1/days/"+date+"/body-weight", map[string]any{"weightKg": "75.5"}, 0), 200)
	}
}

func TestBodyWeightSuggestionIsPreviousPrivateMeasurement(t *testing.T) {
	app := domaintest.New(t)
	(&Service{Core: app.Core, Auth: app.Auth}).RegisterRoutes(app.Mux)
	a, b := app.User(t, "suggestion"), app.User(t, "foreign")
	date := programs.Today(a.Session.User.Timezone)
	parsed, _ := time.Parse("2006-01-02", date)
	old := parsed.AddDate(0, 0, -4).Format("2006-01-02")
	earlier := parsed.AddDate(0, 0, -7).Format("2006-01-02")
	for _, row := range []struct{ user, date, weight string }{{a.Session.User.ID, earlier, "95"}, {a.Session.User.ID, old, "97"}, {b.Session.User.ID, old, "70"}} {
		if _, err := app.Core.Pool.Exec(context.Background(), `INSERT INTO body_weights(user_id,local_date,weight_kg) VALUES($1,$2,$3)`, row.user, row.date, row.weight); err != nil {
			t.Fatal(err)
		}
	}
	read := func(date string) Day {
		var day Day
		domaintest.Decode(t, app.Request(a, "GET", "/api/v1/days/"+date, nil, "", ""), &day)
		return day
	}
	day := read(date)
	if day.BodyWeight != nil || day.BodyWeightSuggestion == nil || day.BodyWeightSuggestion.WeightKg != "97.00" || day.BodyWeightSuggestion.LocalDate != old {
		t.Fatal(day)
	}
	// Reading a future day does not create measurements or look past its date.
	day = read(parsed.AddDate(0, 0, 2).Format("2006-01-02"))
	if day.BodyWeight != nil || day.BodyWeightSuggestion == nil || day.BodyWeightSuggestion.WeightKg != "97.00" {
		t.Fatal(day)
	}
	day = read(old)
	if day.BodyWeight.WeightKg != "97.00" || day.BodyWeightSuggestion.WeightKg != "95.00" {
		t.Fatal(day)
	}
	day = read(earlier)
	if day.BodyWeightSuggestion != nil {
		t.Fatal("future value leaked into earlier date")
	}
	domaintest.Status(t, app.Write(a, "PUT", "/api/v1/days/"+date+"/body-weight", map[string]any{"weightKg": "97"}, 0), 200)
	day = read(date)
	if day.BodyWeight == nil || day.BodyWeight.Version != 1 || day.BodyWeightSuggestion.LocalDate != old {
		t.Fatal(day)
	}
	var count int
	if err := app.Core.Pool.QueryRow(context.Background(), `SELECT count(*) FROM body_weights WHERE user_id=$1`, a.Session.User.ID).Scan(&count); err != nil || count != 3 {
		t.Fatal(count, err)
	}
}
