package programs

func ValidateExercises(exercises []InputExercise) error {
	date := Today("UTC")
	return validate(Input{date, date, date, "UTC", []InputDay{{1, exercises}}})
}
