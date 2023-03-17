import { screen } from "@testing-library/react";
import { PluginsSelector } from "./MainPage";
import { Formik, Form } from "formik";
import { render } from "../test-utils";

const psMock = {
	label: "Category",
	name: "category",
	group: "categoryPlugins",
	plugins: [
		{ displayName: "Wilburs Secrets", apiName: "some_pig", group: "pigs" },
		{ displayName: "Ms Piggy", apiName: "ms_piggie", group: "pigs" },
	],
	icon: <></>,
};

describe("PluginsSelector component", () => {
	let user: any;
	const renderPS = (options: any) => {
		const renderArgs = render(
			<Formik
				initialValues={{
					category: true,
					categoryPlugins: ["some_pig", "ms_piggie"],
				}}
				onSubmit={() => {}}
			>
				{() => (
					<Form>
						<PluginsSelector {...options} />
					</Form>
				)}
			</Formik>
		);
		user = renderArgs.user;
	};

	it("all plugins checked then category checked; all plugins unchecked then category unchecked; otherwise, indeterminate set", async () => {
		renderPS(psMock);

		// category has a title and is checked (since form category: true)
		const categoryCheck = screen.getByRole("checkbox", { name: "Category" });
		expect(categoryCheck).toBeChecked();
		// checkbox should not be indeterminate since all plugins checked
		expect(categoryCheck).toHaveAttribute("data-indeterminate", "false");
		screen.getByText("2 of 2 plugins selected");

		// expand the accordion
		const expandButton = screen.getByRole("button", {
			name: `Show ${psMock.label} plugins`,
		});
		await user.click(expandButton);

		// check each plugin selected
		const pluginCheck1 = screen.getByRole("checkbox", {
			name: psMock.plugins[0].displayName,
		});
		expect(pluginCheck1).toBeChecked();

		const pluginCheck2 = screen.getByRole("checkbox", {
			name: psMock.plugins[1].displayName,
		});
		expect(pluginCheck2).toBeChecked();

		// uncheck 1st plugin
		// indeterminate should be set (subset of plugins checked), plugin selection count should be updated, category should still be checked
		await user.click(pluginCheck1);
		expect(categoryCheck).toHaveAttribute("data-indeterminate", "true");
		screen.getByText("1 of 2 plugins selected");
		expect(categoryCheck).toBeChecked();

		// uncheck 2nd plugin
		// indeterminate should not be set (all plugins unchecked), plugin selection count should be updated, category should be unchecked
		await user.click(pluginCheck2);
		expect(categoryCheck).toHaveAttribute("data-indeterminate", "false");
		screen.getByText("0 of 2 plugins selected");
		expect(categoryCheck).not.toBeChecked();

		// clicking categoryt checkbox should enable all plugins
		await user.click(categoryCheck);
		expect(categoryCheck).toHaveAttribute("data-indeterminate", "false");
		screen.getByText("2 of 2 plugins selected");
		expect(pluginCheck1).toBeChecked();
		expect(pluginCheck2).toBeChecked();

		// clicking categoryt checkbox should disable all plugins
		await user.click(categoryCheck);
		expect(categoryCheck).toHaveAttribute("data-indeterminate", "false");
		screen.getByText("0 of 2 plugins selected");
		expect(pluginCheck1).not.toBeChecked();
		expect(pluginCheck2).not.toBeChecked();

		// check 1st plugin
		// indeterminate should be set (subset of plugins checked), plugin selection count should be updated, category should not be unchecked
		await user.click(pluginCheck1);
		expect(categoryCheck).toHaveAttribute("data-indeterminate", "true");
		screen.getByText("1 of 2 plugins selected");
		expect(categoryCheck).not.toBeChecked();

		// check 2nd plugin
		// indeterminate should not be set (all plugins checked), plugin selection count should be updated, category should be unchecked
		await user.click(pluginCheck2);
		expect(categoryCheck).toHaveAttribute("data-indeterminate", "false");
		screen.getByText("2 of 2 plugins selected");
		expect(categoryCheck).toBeChecked();
	});

	describe("Controlled usage", () => {
		it("expanded=true renders open component", async () => {
			const mockExpandedChange = jest.fn();
			renderPS({
				...psMock,
				expanded: true,
				onExpandedChange: mockExpandedChange,
			});

			const expandButton = screen.getByRole("button", {
				name: `Hide ${psMock.label} plugins`,
			});

			// check a plugin is visible
			screen.getByRole("checkbox", {
				name: psMock.plugins[0].displayName,
			});

			expect(mockExpandedChange).not.toHaveBeenCalled();

			// closing component should trigger onExpandedChange callback
			// with no name
			await user.click(expandButton);

			expect(mockExpandedChange).toHaveBeenCalledWith("");
		});

		it("expanded=false renders closed component", async () => {
			const mockExpandedChange = jest.fn();
			renderPS({
				...psMock,
				expanded: false,
				onExpandedChange: mockExpandedChange,
			});

			const expandButton = screen.getByRole("button", {
				name: `Show ${psMock.label} plugins`,
			});

			// check a plugin is not visible
			expect(
				screen.queryByRole("checkbox", {
					name: psMock.plugins[0].displayName,
				})
			).not.toBeInTheDocument();

			expect(mockExpandedChange).not.toHaveBeenCalled();

			// opening component should trigger onExpandedChange callback
			// with name of component opened
			await user.click(expandButton);

			expect(mockExpandedChange).toHaveBeenCalledWith(psMock.name);
		});
	});
});
