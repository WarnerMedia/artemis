import { screen } from "@testing-library/react";
import { PluginsSelector } from "./MainPage";
import { Formik, Form } from "formik";
import { render } from "../test-utils";

const psMock = {
	formikStateGroupName: "fooString",
	idName: "bazString",
	isDisabled: true,
	plugins: [
		{ displayName: "Wilburs Secrets", apiName: "some_pig", group: "pigs" },
		{ displayName: `Ms Piggy`, apiName: "ms_piggie", group: "pigs" },
	],
};

describe("ScanOptionsSummary component", () => {
	beforeEach(() => {
		render(
			<Formik initialValues={{}} onSubmit={() => {}}>
				{({ submitForm, isValid, values }) => (
					<Form>
						<PluginsSelector {...psMock} />
					</Form>
				)}
			</Formik>
		);
	});

	it("displays the plugin names inside the accordion", async () => {
		expect(screen.getByText(/Plugins/)).toBeInTheDocument();
		expect(screen.getByText(/Wilburs Secrets/)).toBeInTheDocument();
		expect(screen.getByText(/Ms Piggy/)).toBeInTheDocument();
	});

	it("when the checkbox is unchecked, then the accordion is disabled", async () => {
		const selector = screen.getByRole("button");
		expect(selector).toHaveClass("Mui-disabled");
	});
});
