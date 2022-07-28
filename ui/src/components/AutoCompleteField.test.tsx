import { render, screen } from "test-utils";
import { Formik, Form } from "formik";
import AutoCompleteField, { AutoCompleteFieldProps } from "./AutoCompleteField";
import { InputAdornment } from "@mui/material";

describe("AutoCompleteField component", () => {
	jest.setTimeout(30000);

	test("displays input field without label", () => {
		const initialValues = {
			"acf-test-1": null, // no default value selected
		};
		const props: AutoCompleteFieldProps = {
			id: "acf-test-1",
			name: "acf-test-1",
			options: ["foo", "bar", "baz", "foobar", "barbaz", "foobarbaz"],
		};
		render(
			<Formik initialValues={initialValues} onSubmit={() => {}}>
				<Form noValidate autoComplete="off">
					<AutoCompleteField {...props} />
				</Form>
			</Formik>
		);

		expect(screen.getByRole("combobox", { name: "" })).toBeInTheDocument();
	});

	test("displays input field with a label", () => {
		const initialValues = {
			"acf-test-1": null, // no default value selected
		};
		const props: AutoCompleteFieldProps = {
			id: "acf-test-1",
			name: "acf-test-1",
			options: ["foo", "bar", "baz", "foobar", "barbaz", "foobarbaz"],
			label: "Test Me",
		};
		render(
			<Formik initialValues={initialValues} onSubmit={() => {}}>
				<Form noValidate autoComplete="off">
					<AutoCompleteField {...props} />
				</Form>
			</Formik>
		);

		expect(
			screen.getByRole("combobox", { name: "Test Me" })
		).toBeInTheDocument();
	});

	test("displays input field with a start adornment", () => {
		const initialValues = {
			"acf-test-1": null, // no default value selected
		};
		const props: AutoCompleteFieldProps = {
			id: "acf-test-1",
			name: "acf-test-1",
			options: ["foo", "bar", "baz", "foobar", "barbaz", "foobarbaz"],
			label: "Test Me",
			InputProps: {
				startAdornment: <InputAdornment position="start"></InputAdornment>,
			},
		};
		render(
			<Formik initialValues={initialValues} onSubmit={() => {}}>
				<Form noValidate autoComplete="off">
					<AutoCompleteField {...props} />
				</Form>
			</Formik>
		);

		/* testing:
		 * <div>
		 *   <div class="MuiInputAdornment-positionStart"/>  <== this sibling element has this class name
		 *   <input />
		 * </div>
		 */
		const inputField = screen.getByRole("combobox", { name: "Test Me" });
		expect(inputField).toBeInTheDocument();
		if (inputField && inputField.parentElement) {
			expect(inputField.parentElement.firstChild).toHaveClass(
				"MuiInputAdornment-positionStart"
			);
		} else {
			fail("Autocomplete did not match the expected element tree");
		}
	});

	test("displays initial option selected", () => {
		const initialValues = {
			"acf-test-1": "foo", // intial option to select
		};
		const props: AutoCompleteFieldProps = {
			id: "acf-test-1",
			name: "acf-test-1",
			options: ["foo", "bar", "baz", "foobar", "barbaz", "foobarbaz"],
			label: "Test Me",
		};
		render(
			<Formik initialValues={initialValues} onSubmit={() => {}}>
				<Form noValidate autoComplete="off">
					<AutoCompleteField {...props} />
				</Form>
			</Formik>
		);

		expect(screen.getByDisplayValue("foo")).toBeInTheDocument();
	});

	test("displays helper text", () => {
		const initialValues = {
			"acf-test-1": "foo", // intial option to select
		};
		const props: AutoCompleteFieldProps = {
			id: "acf-test-1",
			name: "acf-test-1",
			options: ["foo", "bar", "baz", "foobar", "barbaz", "foobarbaz"],
			label: "Test Me",
			helperText: "Helper Text",
		};
		render(
			<Formik initialValues={initialValues} onSubmit={() => {}}>
				<Form noValidate autoComplete="off">
					<AutoCompleteField {...props} />
				</Form>
			</Formik>
		);

		expect(screen.getByText("Helper Text")).toBeInTheDocument();
	});

	test("displays placeholder", () => {
		const initialValues = {
			"acf-test-1": "foo", // intial option to select
		};
		const props: AutoCompleteFieldProps = {
			id: "acf-test-1",
			name: "acf-test-1",
			options: ["foo", "bar", "baz", "foobar", "barbaz", "foobarbaz"],
			label: "Test Me",
			placeholder: "Placeholder",
		};
		render(
			<Formik initialValues={initialValues} onSubmit={() => {}}>
				<Form noValidate autoComplete="off">
					<AutoCompleteField {...props} />
				</Form>
			</Formik>
		);

		expect(screen.queryAllByPlaceholderText("Placeholder")).toHaveLength(2);
	});

	test("input disabled", () => {
		const initialValues = {
			"acf-test-1": "foo", // intial option to select
		};
		const props: AutoCompleteFieldProps = {
			id: "acf-test-1",
			name: "acf-test-1",
			options: ["foo", "bar", "baz", "foobar", "barbaz", "foobarbaz"],
			label: "Test Me",
			disabled: true,
		};
		render(
			<Formik initialValues={initialValues} onSubmit={() => {}}>
				<Form noValidate autoComplete="off">
					<AutoCompleteField {...props} />
				</Form>
			</Formik>
		);

		expect(screen.getByRole("combobox", { name: "Test Me" })).toBeDisabled();
	});

	test("input displays loading", async () => {
		const initialValues = {
			"acf-test-1": "foo", // intial option to select
		};
		const props: AutoCompleteFieldProps = {
			id: "acf-test-1",
			name: "acf-test-1",
			options: ["foo", "bar", "baz", "foobar", "barbaz", "foobarbaz"],
			label: "Test Me",
			loading: true,
		};
		render(
			<Formik initialValues={initialValues} onSubmit={() => {}}>
				<Form noValidate autoComplete="off">
					<AutoCompleteField {...props} />
				</Form>
			</Formik>
		);

		expect(screen.queryByLabelText(/loading/i)).toBeInTheDocument();
	});

	test("autocomplete auto completes input", async () => {
		// required in order for userEvent.type to work
		// this will be fixed when upgrading to Jest >= 26 (via upgrading CRA)
		// see:
		// https://github.com/testing-library/user-event/issues/237
		// https://github.com/mui-org/material-ui/issues/15726#issuecomment-493124813
		global.document.createRange = () => ({
			setStart: () => {},
			setEnd: () => {},
			// @ts-ignore
			commonAncestorContainer: {
				nodeName: "BODY",
				ownerDocument: document,
			},
		});

		const initialValues = {
			"acf-test-1": "foo", // intial option to select
		};
		const props: AutoCompleteFieldProps = {
			id: "acf-test-1",
			name: "acf-test-1",
			options: ["foo", "bar", "baz", "foobar", "barbaz", "foobarbaz"],
			label: "Test Me",
		};
		const { user } = render(
			<Formik initialValues={initialValues} onSubmit={() => {}}>
				<Form noValidate autoComplete="off">
					<AutoCompleteField {...props} />
				</Form>
			</Formik>
		);

		const inputEl = screen.getByLabelText("Test Me");
		await user.type(inputEl, "foo");
		let matches = await screen.findAllByText(/foo/);
		expect(matches).toHaveLength(3); // matched 3 choices (foo, foobar, foobarbaz)

		await user.clear(inputEl);
		await user.type(inputEl, "bar");
		matches = await screen.findAllByText(/bar/);
		expect(matches).toHaveLength(4); // matched 3 choices (bar, foobar, barbaz, foobarbaz)

		await user.clear(inputEl);
		await user.type(inputEl, "baz");
		matches = await screen.findAllByText(/baz/);
		expect(matches).toHaveLength(3); // matched 3 choices (baz, barbaz, foobarbaz)

		await user.clear(inputEl);
		await user.type(inputEl, "foobar");
		matches = await screen.findAllByText(/foobar/);
		expect(matches).toHaveLength(2); // matched 2 choices (foobar, foobarbaz)
	});

	test("autocomplete auto completes object array options", async () => {
		// required in order for userEvent.type to work
		// this will be fixed when upgrading to Jest >= 26 (via upgrading CRA)
		// see:
		// https://github.com/testing-library/user-event/issues/237
		// https://github.com/mui-org/material-ui/issues/15726#issuecomment-493124813
		global.document.createRange = () => ({
			setStart: () => {},
			setEnd: () => {},
			// @ts-ignore
			commonAncestorContainer: {
				nodeName: "BODY",
				ownerDocument: document,
			},
		});

		const initialValues = {
			"acf-test-1": "foo", // intial option to select
		};
		const props: AutoCompleteFieldProps = {
			id: "acf-test-1",
			name: "acf-test-1",
			// getOptionLabel attrbute required to define which field in the options object
			// should be displayed/matched in the autocomplete list
			getOptionLabel: (option: { displayName: string }) => {
				return option.displayName;
			},
			options: [
				{ id: "1", displayName: "foo" },
				{ id: "2", displayName: "bar" },
				{ id: "3", displayName: "baz" },
				{ id: "4", displayName: "foobar" },
				{ id: "5", displayName: "barbaz" },
				{ id: "6", displayName: "foobarbaz" },
			],
			label: "Test Me",
		};
		const { user } = render(
			<Formik initialValues={initialValues} onSubmit={() => {}}>
				<Form noValidate autoComplete="off">
					<AutoCompleteField {...props} />
				</Form>
			</Formik>
		);

		const inputEl = screen.getByLabelText("Test Me");
		await user.type(inputEl, "foo");
		let matches = await screen.findAllByText(/foo/);
		expect(matches).toHaveLength(3); // matched 3 choices (foo, foobar, foobarbaz)

		await user.clear(inputEl);
		await user.type(inputEl, "bar");
		matches = await screen.findAllByText(/bar/);
		expect(matches).toHaveLength(4); // matched 3 choices (bar, foobar, barbaz, foobarbaz)

		await user.clear(inputEl);
		await user.type(inputEl, "baz");
		matches = await screen.findAllByText(/baz/);
		expect(matches).toHaveLength(3); // matched 3 choices (baz, barbaz, foobarbaz)

		await user.clear(inputEl);
		await user.type(inputEl, "foobar");
		matches = await screen.findAllByText(/foobar/);
		expect(matches).toHaveLength(2); // matched 2 choices (foobar, foobarbaz)
	});
});
