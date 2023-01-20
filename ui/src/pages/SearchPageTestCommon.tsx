import { fireEvent, screen, waitFor, within } from "test-utils";

export const DATE_FORMAT = "yyyy/LL/dd HH:mm";
export const DATE_PLACEHOLDER = "yyyy/MM/dd HH:mm (24-hour)";
export const SEARCH_OPTION_COMPONENT = "Components or Licenses";
export const SEARCH_OPTION_REPOS = "Repositories";
export const SEARCH_OPTION_VULNS = "Vulnerabilities";
export const SEARCH_OPTIONS = [
	SEARCH_OPTION_COMPONENT,
	SEARCH_OPTION_REPOS,
	SEARCH_OPTION_VULNS,
];
export const DEFAULT_SEARCH_OPTION = SEARCH_OPTION_COMPONENT;

export const validateSelect = async (options: {
	role?: "button" | "combobox";
	label: string | RegExp;
	withinElement?: HTMLElement; // only search within this element
	options: string[];
	defaultOption?: string;
	disabled?: boolean;
	focused?: boolean;
	selectOption?: string;
	user: any;
}) => {
	// validate default value
	// note: only querying a11y tree here using *Role queries
	// this is to prevent hidden items from being returned, such as would be the case for *LabelText, etc. element selectors
	let selectField: HTMLElement;
	if (options?.withinElement) {
		selectField = await within(options.withinElement).findByRole(
			options?.role ?? "button",
			{
				name: options.label,
			}
		);
	} else {
		selectField = await screen.findByRole(options?.role ?? "button", {
			name: options.label,
		});
	}

	if ("disabled" in options) {
		if (options.disabled === true) {
			expect(selectField).toBeDisabled();
		} else {
			expect(selectField).not.toBeDisabled();
		}
	}

	if (options.defaultOption) {
		within(selectField).getByText(options?.defaultOption);
	}

	await options?.user.click(selectField);
	await waitFor(() => {
		screen.queryByRole("listbox", { name: options?.label });
	});
	const popup = screen.getByRole("listbox", { name: options?.label });
	for (let i = 0; i < options.options.length; i += 1) {
		const optionText = within(popup).getByRole("option", {
			name: String(options.options[i]),
		});
		if (
			"focused" in options &&
			String(options.options[i]) === options.defaultOption
		) {
			if (options.focused === true) {
				expect(optionText).toHaveFocus();
			}
		}
		if (
			"selectOption" in options &&
			options.selectOption === String(options.options[i])
		) {
			await options?.user.click(optionText);
			await waitFor(() => {
				within(selectField).getByText(String(options.options[i]));
			});
			break;
		}
	}

	// close selectbox by hitting escape
	if (!("selectOption" in options)) {
		await options?.user.keyboard("{Escape}");
	}

	// check select box closed
	await waitFor(() =>
		expect(
			screen.queryByRole("listbox", { name: options?.label })
		).not.toBeInTheDocument()
	);
};

export const testFieldLength = async (
	fieldName: string | RegExp,
	maxLength: number,
	expectedError: string,
	user: any
) => {
	let testValue = "z".repeat(maxLength + 1); // invalid length value
	const testComponent = await screen.findByRole("textbox", {
		name: fieldName,
	});
	await user.clear(testComponent);
	await user.type(testComponent, testValue);
	fireEvent.blur(testComponent);
	await waitFor(() => expect(testComponent).toHaveDisplayValue(testValue));
	await waitFor(() =>
		expect(screen.getByText(expectedError)).toBeInTheDocument()
	);

	// submit button should be disabled since form now invalid
	const submitButton = screen.getByRole("button", {
		name: /^search$/i,
	});
	expect(submitButton).toBeDisabled();

	await user.clear(testComponent);
	await waitFor(() => expect(testComponent).toHaveDisplayValue(""));
	await waitFor(() =>
		expect(screen.queryByText(expectedError)).not.toBeInTheDocument()
	);
	expect(submitButton).not.toBeDisabled();

	testValue = "z".repeat(maxLength); // valid length value
	await user.type(testComponent, testValue);
	fireEvent.blur(testComponent);
	await waitFor(() => expect(testComponent).toHaveDisplayValue(testValue));
	await waitFor(() =>
		expect(screen.queryByText(expectedError)).not.toBeInTheDocument()
	);
	expect(submitButton).not.toBeDisabled(); // form now valid, buttons should not be disabled
};

export const testFieldValid = async (
	fieldName: string | RegExp,
	value: string,
	unexpectedError: string,
	role: "textbox" | "combobox" = "textbox",
	user: any
) => {
	const testComponent = await screen.findByRole(role, {
		name: fieldName,
	});

	await user.clear(testComponent);
	await user.type(testComponent, value + "{enter}");
	fireEvent.blur(testComponent);
	await waitFor(() => expect(testComponent).toHaveDisplayValue(value));
	await waitFor(() =>
		expect(screen.queryByText(unexpectedError)).not.toBeInTheDocument()
	);

	const submitButton = screen.getByRole("button", {
		name: /^search$/i,
	});
	expect(submitButton).not.toBeDisabled();
};

export const testFieldInvalid = async (
	fieldName: string | RegExp,
	value: string,
	expectedError: string,
	role: "combobox" | "textbox" = "combobox",
	user: any
) => {
	const testComponent = await screen.findByRole(role, {
		name: fieldName,
	});
	const submitButton = screen.getByRole("button", {
		name: /^search$/i,
	});

	// test 1 character at a time to see if it's invalid
	// since once 1 character triggers invalidation you won't know
	// whether next char is valid or not
	const chars = value.split("");
	for (let i = 0; i < value.length; i += 1) {
		let char = chars[i];
		let displayChar = char;
		switch (char) {
			case "{":
				// { and [ are special characters that need to be escaped by doubling, i.e., {{ [[
				// from testing it appears that they also need to be surrounded by other valid chars
				// or get stripped
				// see:
				// https://github.com/testing-library/user-event/issues/584
				char = "x{{x";
				displayChar = "x{x";
				break;
			case "[":
				char = "x[[x";
				displayChar = "x[x";
				break;
			case " ":
				// space chars need to be surrounded with another valid character
				// otherwise, field leading+trailing space gets stripped
				char = "x x";
				displayChar = char;
				break;
		}

		// enter keypress required in case we are entering this value into a auto-select box
		// so that we select the matching result for this input
		await user.clear(testComponent);
		await user.type(testComponent, char + "{enter}");
		fireEvent.blur(testComponent);
		await waitFor(() => expect(testComponent).toHaveDisplayValue(displayChar));
		await waitFor(() =>
			expect(screen.getByText(expectedError)).toBeInTheDocument()
		);
		expect(submitButton).toBeDisabled();
	}
};

const SearchPageCommon = {
	DATE_FORMAT,
	DATE_PLACEHOLDER,
	SEARCH_OPTION_COMPONENT,
	SEARCH_OPTION_REPOS,
	SEARCH_OPTION_VULNS,
	SEARCH_OPTIONS,
};

export default SearchPageCommon;
