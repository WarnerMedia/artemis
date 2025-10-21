import { DateTime, Settings } from "luxon";
import * as Yup from "yup";
import { fireEvent, render, screen, waitFor } from "test-utils";
import { Field, Formik, Form } from "formik";
import DatePickerField from "components/FormikPickers";

const DATE_FORMAT = "yyyy/LL/dd HH:mm";

beforeAll(() => {
	// ensure consistent timezone for tests
	// don't set to UTC so we can check offsets working in tests
	Settings.defaultZone = "America/New_York";
});

test("displays input field without label", () => {
	const initialValues = {
		"datetime-test-1": null, // no initial time value
	};
	const props: any = {
		id: "datetime-test-1",
		name: "datetime-test-1",
		onChange: () => {},
	};
	render(
		<Formik initialValues={initialValues} onSubmit={() => {}}>
			<Form noValidate autoComplete="off">
				<Field component={DatePickerField} {...props} />
			</Form>
		</Formik>,
	);

	expect(screen.getByRole("group", { name: "" })).toBeInTheDocument();
});

test("displays input field with a label", () => {
	const initialValues = {
		"datetime-test-1": null, // no default value selected
	};
	const props: any = {
		id: "datetime-test-1",
		name: "datetime-test-1",
		label: "Test Me",
	};
	render(
		<Formik initialValues={initialValues} onSubmit={() => {}}>
			<Form noValidate autoComplete="off">
				<Field component={DatePickerField} {...props} />
			</Form>
		</Formik>,
	);

	expect(screen.getByRole("group", { name: "Test Me" })).toBeInTheDocument();
});

test("displays error if initial date value valid", () => {
	const initialValues = {
		"datetime-test-1": "foo", // initial date value
	};
	const props: any = {
		id: "datetime-test-1",
		name: "datetime-test-1",
		label: "Test Me",
	};
	render(
		<Formik initialValues={initialValues} onSubmit={() => {}}>
			<Form noValidate autoComplete="off">
				<Field component={DatePickerField} {...props} />
			</Form>
		</Formik>,
	);

	expect(screen.getByText(/invalid date format/i)).toBeInTheDocument();
});

test("displays initial date value if date valid", () => {
	const dt = DateTime.now();
	const initialValues = {
		"datetime-test-1": dt.toUTC().toISO(), // initial date value
	};
	const props: any = {
		id: "datetime-test-1",
		name: "datetime-test-1",
		label: "Test Me",
		ampm: false,
		format: DATE_FORMAT, // enforce a date format to ensure consistent results
	};
	render(
		<Formik initialValues={initialValues} onSubmit={() => {}}>
			<Form noValidate autoComplete="off">
				<Field component={DatePickerField} {...props} />
			</Form>
		</Formik>,
	);

	expect(
		screen.getByDisplayValue(dt.toFormat(DATE_FORMAT)),
	).toBeInTheDocument();
});

test("displays placeholder", () => {
	const dt = DateTime.now();
	const initialValues = {
		"datetime-test-1": dt.toUTC().toISO(), // initial date value
	};
	const props: any = {
		id: "datetime-test-1",
		name: "datetime-test-1",
		label: "Test Me",
		placeholder: "yyyy/MM/dd HH:mm (24-hour)",
	};
	render(
		<Formik initialValues={initialValues} onSubmit={() => {}}>
			<Form noValidate autoComplete="off">
				<Field component={DatePickerField} {...props} />
			</Form>
		</Formik>,
	);

	expect(screen.getByPlaceholderText(props.placeholder)).toBeInTheDocument();
});

test("input disabled", async () => {
	const dt = DateTime.now();
	const initialValues = {
		"datetime-test-1": dt.toUTC().toISO(), // initial date value
	};
	const props: any = {
		id: "date_field",
		name: "date_field",
		label: "Test Me",
		placeholder: "yyyy/MM/dd HH:mm (24-hour)",
		disabled: true,
	};
	render(
		<Formik initialValues={initialValues} onSubmit={() => {}}>
			<Form noValidate autoComplete="off">
				<Field component={DatePickerField} {...props} />
			</Form>
		</Formik>,
	);
	const inputField = await screen.findByTestId("date_field_date_input");

	expect(inputField).toBeDisabled();
});

test("displays value matching format", () => {
	const dt = DateTime.now();
	const initialValues = {
		"datetime-test-1": dt.toUTC().toISO(), // initial date value
	};
	const props: any = {
		id: "datetime-test-1",
		name: "datetime-test-1",
		label: "Test Me",
		ampm: false,
		format: DATE_FORMAT,
	};
	render(
		<Formik initialValues={initialValues} onSubmit={() => {}}>
			<Form noValidate autoComplete="off">
				<Field component={DatePickerField} {...props} />
			</Form>
		</Formik>,
	);

	// expect format: Month Day Hour:Minute"
	expect(
		screen.getByDisplayValue(dt.toFormat(DATE_FORMAT)),
	).toBeInTheDocument();
});

test("disablePast disallows initial past dates", async () => {
	const dt = DateTime.now().minus({ days: 1 });
	const initialValues = {
		date_field: dt.toUTC().toISO(), // initial date value
	};
	const props: any = {
		id: "date_field",
		name: "date_field",
		label: "Test Me",
		ampm: false,
		format: DATE_FORMAT,
		disablePast: true,
		minDateMessage: "min-date",
	};
	render(
		<Formik initialValues={initialValues} onSubmit={() => {}}>
			<Form noValidate autoComplete="off">
				<Field component={DatePickerField} {...props} />
			</Form>
		</Formik>,
	);

	// expect format: Month Day Hour:Minute"
	const inputField = await screen.findByTestId("date_field_date_input");
	expect(inputField).toHaveAttribute("value", dt.toFormat(DATE_FORMAT));

	const datepicker = screen.getByRole("group", { name: "Test Me" });
	expect(datepicker).toHaveAccessibleDescription(props.minDateMessage);
});

test("disablePast disallows past date entry", async () => {
	const dt = DateTime.now().minus({ days: 1 });
	const initialValues = {
		"datetime-test-1": null, // initial date value
	};
	const props: any = {
		id: "date_field",
		name: "date_field",
		label: "Test Me",
		ampm: false,
		format: DATE_FORMAT,
		disablePast: true,
		minDateMessage: "min-date",
	};
	render(
		<Formik initialValues={initialValues} onSubmit={() => {}}>
			<Form noValidate autoComplete="off">
				<Field component={DatePickerField} {...props} />
			</Form>
		</Formik>,
	);

	const fieldValue = dt.toFormat(DATE_FORMAT);
	const inputField = await screen.findByTestId("date_field_date_input");
	fireEvent.change(inputField, {
		target: { value: fieldValue },
	});
	expect(inputField).toHaveAttribute("value", fieldValue);

	const datepicker = screen.getByRole("group", { name: "Test Me" });
	await waitFor(() => {
		expect(datepicker).toHaveAccessibleDescription(props.minDateMessage);
	});
});

test("minDate disallows date entry before minDate", async () => {
	const minDate = DateTime.now().minus({ days: 10 });
	const beforeMin = DateTime.now().minus({ days: 11 });
	const initialValues = {
		"datetime-test-1": null, // initial date value
	};
	const props: any = {
		id: "date_field",
		name: "date_field",
		label: "Test Me",
		ampm: false,
		format: DATE_FORMAT,
		minDate: minDate,
		minDateMessage: "min-date",
	};
	render(
		<Formik initialValues={initialValues} onSubmit={() => {}}>
			<Form noValidate autoComplete="off">
				<Field component={DatePickerField} {...props} />
			</Form>
		</Formik>,
	);

	const fieldValue = beforeMin.toFormat(DATE_FORMAT);
	const inputField = await screen.findByTestId("date_field_date_input");
	fireEvent.change(inputField, {
		target: { value: fieldValue },
	});
	expect(inputField).toHaveAttribute("value", fieldValue);

	const datepicker = screen.getByRole("group", { name: "Test Me" });
	await waitFor(() => {
		expect(datepicker).toHaveAccessibleDescription(props.minDateMessage);
	});
});

test("schema with min disallows date entry before min date", async () => {
	const minDate = DateTime.now().minus({ days: 10 });
	const minError = "min-date";
	const schema = Yup.object({
		date_field: Yup.date().nullable().default(null).min(minDate, minError),
	}).defined();

	const beforeMin = DateTime.now().minus({ days: 11 });
	const initialValues = {
		date_field: null, // initial date value
	};
	const props: any = {
		id: "date_field",
		name: "date_field",
		label: "Test Me",
		ampm: false,
		format: DATE_FORMAT,
	};
	render(
		<Formik
			initialValues={initialValues}
			validationSchema={schema}
			onSubmit={() => {}}
		>
			<Form noValidate autoComplete="off">
				<Field component={DatePickerField} {...props} />
			</Form>
		</Formik>,
	);

	const fieldValue = beforeMin.toFormat(DATE_FORMAT);
	const inputField = await screen.findByTestId("date_field_date_input");
	fireEvent.change(inputField, {
		target: { value: fieldValue },
	});
	expect(inputField).toHaveAttribute("value", fieldValue);

	const datepicker = screen.getByRole("group", { name: "Test Me" });
	await waitFor(() => {
		expect(datepicker).toHaveAccessibleDescription(minError);
	});
});

test("disableFuture disallows initial future dates", () => {
	const dt = DateTime.now().plus({ days: 1 });
	const initialValues = {
		date_field: dt.toUTC().toISO(), // initial date value
	};
	const props: any = {
		id: "datetime-test-1",
		name: "date_field",
		label: "Test Me",
		ampm: false,
		format: DATE_FORMAT,
		disableFuture: true,
		maxDateMessage: "max-date",
	};
	render(
		<Formik initialValues={initialValues} onSubmit={() => {}}>
			<Form noValidate autoComplete="off">
				<Field component={DatePickerField} {...props} />
			</Form>
		</Formik>,
	);
	const datepicker = screen.getByRole("group", { name: "Test Me" });

	expect(
		screen.getByDisplayValue(dt.toFormat(DATE_FORMAT)),
	).toBeInTheDocument();

	expect(datepicker).toHaveAccessibleDescription(props.maxDateMessage);
});

test("disableFuture disallows future date entry", async () => {
	const dt = DateTime.now().plus({ days: 1 });
	const initialValues = {
		"datetime-test-1": null, // initial date value
	};
	const props: any = {
		id: "date_field",
		name: "date_field",
		label: "Test Me",
		ampm: false,
		format: DATE_FORMAT,
		disableFuture: true,
		maxDateMessage: "max-date",
	};
	render(
		<Formik initialValues={initialValues} onSubmit={() => {}}>
			<Form noValidate autoComplete="off">
				<Field component={DatePickerField} {...props} />
			</Form>
		</Formik>,
	);

	const fieldValue = dt.toFormat(DATE_FORMAT);
	const inputField = await screen.findByTestId("date_field_date_input");
	fireEvent.change(inputField, {
		target: { value: fieldValue },
	});
	expect(inputField).toHaveAttribute("value", fieldValue);

	const datepicker = screen.getByRole("group", { name: "Test Me" });
	await waitFor(() => {
		expect(datepicker).toHaveAccessibleDescription(props.maxDateMessage);
	});
});

test("maxDate disallows date entry after maxDate", async () => {
	const maxDate = DateTime.now().plus({ days: 10 });
	const afterMax = DateTime.now().plus({ days: 11 });
	const initialValues = {
		"datetime-test-1": null, // initial date value
	};
	const props: any = {
		id: "date_field",
		name: "date_field",
		label: "Test Me",
		ampm: false,
		format: DATE_FORMAT,
		maxDate: maxDate,
		maxDateMessage: "max-date",
	};
	render(
		<Formik initialValues={initialValues} onSubmit={() => {}}>
			<Form noValidate autoComplete="off">
				<Field component={DatePickerField} {...props} />
			</Form>
		</Formik>,
	);

	const fieldValue = afterMax.toFormat(DATE_FORMAT);
	const inputField = await screen.findByTestId("date_field_date_input");
	fireEvent.change(inputField, {
		target: { value: fieldValue },
	});
	expect(inputField).toHaveAttribute("value", fieldValue);

	const datepicker = screen.getByRole("group", { name: "Test Me" });
	await waitFor(() => {
		expect(datepicker).toHaveAccessibleDescription(props.maxDateMessage);
	});
});

test("schema with max disallows date entry after max date", async () => {
	const maxDate = DateTime.now().plus({ days: 10 });
	const maxError = "max-date";
	const schema = Yup.object({
		date_field: Yup.date().nullable().default(null).max(maxDate, maxError),
	}).defined();

	const afterMax = DateTime.now().plus({ days: 11 });
	const initialValues = {
		date_field: null, // initial date value
	};
	const props: any = {
		id: "date_field",
		name: "date_field",
		label: "Test Me",
		ampm: false,
		format: DATE_FORMAT,
	};
	render(
		<Formik
			initialValues={initialValues}
			validationSchema={schema}
			onSubmit={() => {}}
		>
			<Form noValidate autoComplete="off">
				<Field component={DatePickerField} {...props} />
			</Form>
		</Formik>,
	);
	const group = screen.getByRole("group", { name: "Test Me" });
	const input = await screen.findByTestId("date_field_date_input");

	fireEvent.change(input, {
		target: { value: afterMax.toFormat(DATE_FORMAT) },
	});

	expect(input).toHaveAttribute("value", afterMax.toFormat(DATE_FORMAT));

	await waitFor(() => {
		expect(group).toHaveAccessibleDescription(maxError);
	});
});

test("value not matching format cannot be entered", async () => {
	const initialValues = {
		"datetime-test-1": null, // initial date value
	};
	const props: any = {
		id: "date_field",
		name: "date_field",
		label: "Test Me",
		ampm: false,
		format: DATE_FORMAT,
		mask: "____/__/__ __:__", // input is only restricted in MUIv5 if the picker has a mask
	};
	const { user } = render(
		<Formik initialValues={initialValues} onSubmit={() => {}}>
			<Form noValidate autoComplete="off">
				<Field component={DatePickerField} {...props} />
			</Form>
		</Formik>,
	);
	const inputField = await screen.findByTestId("date_field_date_input");

	await user.type(inputField, "foo");
	expect(inputField.nodeValue).toBeNull();

	await waitFor(() => {
		expect(screen.queryByText(/invalid date format/i)).not.toBeInTheDocument();
	});
});

/**
 * Material UI really doesn't like you inputting invalid dates.
 * This same use case is tested in src/pages/__tests__/HiddenFindingDialog/HiddenFindingDialog.test.tsx
 * and it works there for some reason.
 */
test.skip("invalid date produces an error", async () => {
	const initialValues = {
		date_field: null, // initial date value
	};

	const props: any = {
		id: "date_field",
		name: "date_field",
		label: "Test Me",
		ampm: false,
		format: DATE_FORMAT,
	};
	render(
		<Formik initialValues={initialValues} onSubmit={() => {}}>
			<Form noValidate autoComplete="off">
				<Field component={DatePickerField} {...props} />
			</Form>
		</Formik>,
	);

	const inputField = await screen.findByTestId("date_field_date_input");
	fireEvent.change(inputField, {
		target: { value: "2021/02/31 12:00" },
	});

	expect(inputField).toHaveAttribute("value", "2021/02/31 12:00");

	expect(await screen.findByText(/invalid date format/i)).toBeInTheDocument();
});
