ALTER TABLE day_notes DROP CONSTRAINT day_notes_user_id_local_date_key;
CREATE INDEX day_notes_day ON day_notes(user_id,local_date,created_at,id);
