import { render, screen } from "test-utils";
import { DateTime, Settings } from "luxon";
import MailToLink from "components/MailToLink";
import { APP_EMAIL_AUTHOR } from "app/globals";

const DEFAULT_RECIPIENT = APP_EMAIL_AUTHOR;

describe("MailToLink component", () => {
	beforeAll(() => {
		// ensure consistent timezone for tests
		// don't set to UTC so we can check offsets working in tests
		Settings.defaultZone = "America/New_York";
	});

	describe("Invalid recipient should not produce an email link", () => {
		test.each([
			["multipleatsigns@@example.com"],
			["spaces disallowed@example.com"],
			["underscore@_example"],
			["not email"],
			["notemail"],
			["noatsign.com"],
			["me@example.com_DELETED_12345678"],
			["group name_DELETED_12345678"],
			[
				"multipleatsigns@@example.com,spaces disallowed@example.com,xxxx,underscore@_example",
			],
			[
				"multipleatsigns@@example.com, spaces disallowed@example.com, xxxx, underscore@_example",
			],
			[
				"multipleatsigns@@example.com;spaces disallowed@example.com;xxxx;underscore@_example",
			],
			[
				"multipleatsigns@@example.com; spaces disallowed@example.com; xxxx; underscore@_example",
			],
		])("recipient %p", (recipient) => {
			render(<MailToLink recipient={recipient} text={recipient} />);

			screen.getByText(
				recipient.replace(/_DELETED_[0-9]+$/, " (Deleted 1970-05-23)")
			);
			// no link
			expect(screen.queryByRole("link")).not.toBeInTheDocument();
		});
	});

	describe("multiple valid email recipients", () => {
		const mailTo =
			"test1@example.com,test2@example.com,test3@example.com,test4@example.com,test5@example.com";

		test("email recipients separated by comma", () => {
			const recipient = mailTo;
			const text = "Test Me";
			render(<MailToLink text={text} recipient={recipient} />);
			const link = screen.getByRole("link", { name: text });
			expect(link).toHaveAttribute("href", `mailto:${mailTo}`);
		});

		test("email recipients separated by comma+space", () => {
			const recipient = mailTo.replace(",", ", ");
			const text = "Test Me";
			render(<MailToLink text={text} recipient={recipient} />);
			const link = screen.getByRole("link", { name: text });
			expect(link).toHaveAttribute("href", `mailto:${mailTo}`);
		});

		test("email recipients separated by semicolon", () => {
			const recipient = mailTo.replace(",", ";");
			const text = "Test Me";
			render(<MailToLink text={text} recipient={recipient} />);
			const link = screen.getByRole("link", { name: text });
			expect(link).toHaveAttribute("href", `mailto:${mailTo}`);
		});

		test("email recipients separated by semicolon+space", () => {
			const recipient = mailTo.replace(",", "; ");
			const text = "Test Me";
			render(<MailToLink text={text} recipient={recipient} />);
			const link = screen.getByRole("link", { name: text });
			expect(link).toHaveAttribute("href", `mailto:${mailTo}`);
		});

		test("email recipients truncated after 5", () => {
			const recipient = mailTo + ",test6@example.com";
			const text = "Test Me";
			render(<MailToLink text={text} recipient={recipient} />);
			const link = screen.getByRole("link", { name: text });
			expect(link).toHaveAttribute("href", `mailto:${mailTo}`);
		});

		test("invalid email recipients removed", () => {
			const recipient =
				"definitely not valid,noatsign.com,test1@example.com,z2z,test2@example.com,invalid,me@@example.com,invalid email@example.com";
			const text = "Test Me";
			render(<MailToLink text={text} recipient={recipient} />);
			const link = screen.getByRole("link", { name: text });
			expect(link).toHaveAttribute(
				"href",
				`mailto:test1@example.com,test2@example.com`
			);
		});

		test("each recipient is URI encoded", () => {
			const recipients = [
				"first%middle%last@example.com",
				"another%email@example.com",
				"test?&this@example.com",
			];
			const text = "Test Me";
			render(<MailToLink text={text} recipient={recipients.join(",")} />);
			const link = screen.getByRole("link", { name: text });
			expect(link).toHaveAttribute(
				"href",
				`mailto:${encodeURI(recipients[0])},${encodeURI(
					recipients[1]
				)},${encodeURI(recipients[2])}`
			);
		});
	});

	test("uses supplied recipient if valid email address", () => {
		const recipient = "test@example.com";
		const text = "Test Me";
		render(<MailToLink text={text} recipient={recipient} />);
		const link = screen.getByRole("link", { name: text });
		expect(link).toHaveAttribute("href", `mailto:${recipient}`);
	});

	test("uses supplied recipient if valid email address", () => {
		const recipient = "test@example.com";
		const text = "Test Me";
		render(<MailToLink text={text} recipient={recipient} />);
		const link = screen.getByRole("link", { name: text });
		expect(link).toHaveAttribute("href", `mailto:${recipient}`);
	});

	test("link has default security attributes", () => {
		const recipient = "test@example.com";
		const text = "Test Me";
		render(<MailToLink text={text} recipient={recipient} />);
		const link = screen.getByRole("link", { name: text });
		expect(link).toHaveAttribute("href", `mailto:${recipient}`);
		expect(link).toHaveAttribute("target", "_blank");
		expect(link).toHaveAttribute("rel", "noopener noreferrer nofollow");
	});

	test("no recipient, use default", () => {
		const text = "Test Me";
		render(<MailToLink text={text} />);
		const link = screen.getByRole("link", { name: text });
		expect(link).toHaveAttribute("href", `mailto:${DEFAULT_RECIPIENT}`);
	});

	test("recipient is URI encoded", () => {
		const recipient = "first%middle%last@example.com";
		const text = "Test Me";
		render(<MailToLink text={text} recipient={recipient} />);
		const link = screen.getByRole("link", { name: text });
		expect(link).toHaveAttribute("href", `mailto:${encodeURI(recipient)}`);
	});

	test("deleted recipient marked (Deleted <date>)", () => {
		const recipient = "username@example.com";
		const text = recipient + "_DELETED_12345678";
		render(<MailToLink text={text} recipient={text} />);
		const expected = `${recipient} (Deleted 1970-05-23)`;
		screen.getByText(expected);
		// no link since user is deleted, shouldn't have a valid email address
		expect(screen.queryByRole("link")).not.toBeInTheDocument();

		// no tooltip since tooltip option not passed
		expect(screen.queryByTitle(expected)).not.toBeInTheDocument();
	});

	test("deleted recipient with invalid deleted time marked (Deleted)", () => {
		const recipient = "username@example.com";
		const text =
			recipient +
			"_DELETED_999999999999999999999999999999999999999999999999999";
		render(<MailToLink text={text} recipient={text} />);
		const expected = `${recipient} (Deleted)`;
		screen.getByText(expected);
		// no link since user is deleted, shouldn't have a valid email address
		expect(screen.queryByRole("link")).not.toBeInTheDocument();

		// no tooltip since tooltip option not passed
		expect(screen.queryByTitle(expected)).not.toBeInTheDocument();
	});

	test("deleted recipient date mtaches (Deleted <date>)", () => {
		const recipient = "username@example.com";
		const epochSeconds = DateTime.utc().toUnixInteger();
		const text = recipient + "_DELETED_" + epochSeconds;
		render(<MailToLink text={text} recipient={text} />);
		const expected = `${recipient} (Deleted ${DateTime.fromSeconds(
			epochSeconds
		).toFormat("yyyy-LL-dd")})`;
		screen.getByText(expected);
		// no link since user is deleted, shouldn't have a valid email address
		expect(screen.queryByRole("link")).not.toBeInTheDocument();

		// no tooltip since tooltip option not passed
		expect(screen.queryByTitle(expected)).not.toBeInTheDocument();
	});

	test("tooltip option displays deleted recipient tooltip", () => {
		const recipient = "username@example.com";
		const text = recipient + "_DELETED_12345678";
		render(<MailToLink text={text} recipient={text} tooltip />);
		const expected = `${recipient} (Deleted 1970-05-23)`;
		screen.getByText(expected);
		// no link since user is deleted, shouldn't have a valid email address
		expect(screen.queryByRole("link")).not.toBeInTheDocument();

		// there should be a tooltip
		expect(screen.getByTitle(expected)).toBeInTheDocument();
	});

	test("deleted group name marked (Deleted <date>)", () => {
		const recipient = "I Am a Group";
		const text = recipient + "_DELETED_12345678";
		render(<MailToLink text={text} recipient={text} />);
		const expected = `${recipient} (Deleted 1970-05-23)`;
		screen.getByText(expected);
		// no link since user is deleted, shouldn't have a valid email address
		expect(screen.queryByRole("link")).not.toBeInTheDocument();

		// no tooltip since tooltip option not passed
		expect(screen.queryByTitle(expected)).not.toBeInTheDocument();
	});

	test("tooltip option displays deleted group name recipient", () => {
		const recipient = "I Am a Group";
		const text = recipient + "_DELETED_12345678";
		render(<MailToLink text={text} recipient={text} tooltip />);
		const expected = `${recipient} (Deleted 1970-05-23)`;
		screen.getByText(expected);
		// no link since user is deleted, shouldn't have a valid email address
		expect(screen.queryByRole("link")).not.toBeInTheDocument();

		// there should be a tooltip
		expect(screen.getByTitle(expected)).toBeInTheDocument();
	});

	test("has a subject", () => {
		const recipient = "test@example.com";
		const text = "Test Me";
		const subject = "ASubject";
		render(<MailToLink text={text} recipient={recipient} subject={subject} />);
		const link = screen.getByRole("link", { name: text });
		expect(link).toHaveAttribute(
			"href",
			`mailto:${recipient}?subject=${subject}`
		);
	});

	test("subject is URI component encoded", () => {
		const recipient = "test@example.com";
		const text = "Test Me";
		const subject = "%^&{}|<>`";
		render(<MailToLink text={text} recipient={recipient} subject={subject} />);
		const link = screen.getByRole("link", { name: text });
		expect(link).toHaveAttribute(
			"href",
			`mailto:${recipient}?subject=${encodeURIComponent(subject)}`
		);
	});

	test("has a body", () => {
		const recipient = "test@example.com";
		const text = "Test Me";
		const body = "ABody";
		render(<MailToLink text={text} recipient={recipient} body={body} />);
		const link = screen.getByRole("link", { name: text });
		expect(link).toHaveAttribute("href", `mailto:${recipient}?body=${body}`);
	});

	test("body is URI component encoded", () => {
		const recipient = "test@example.com";
		const text = "Test Me";
		const body = "%^&{}|<>`";
		render(<MailToLink text={text} recipient={recipient} body={body} />);
		const link = screen.getByRole("link", { name: text });
		expect(link).toHaveAttribute(
			"href",
			`mailto:${recipient}?body=${encodeURIComponent(body)}`
		);
	});

	test("has a subject and body", () => {
		const recipient = "test@example.com";
		const text = "Test Me";
		const subject = "ASubject";
		const body = "ABody";
		render(
			<MailToLink
				text={text}
				recipient={recipient}
				subject={subject}
				body={body}
			/>
		);
		const link = screen.getByRole("link", { name: text });
		expect(link).toHaveAttribute(
			"href",
			`mailto:${recipient}?subject=${subject}&body=${body}`
		);
	});

	test("subject and body are URI component encoded", () => {
		const recipient = "test@example.com";
		const text = "Test Me";
		const body = "%^&{}|<>`";
		render(
			<MailToLink
				text={text}
				recipient={recipient}
				subject={body}
				body={body}
			/>
		);
		const link = screen.getByRole("link", { name: text });
		expect(link).toHaveAttribute(
			"href",
			`mailto:${recipient}?subject=${encodeURIComponent(
				body
			)}&body=${encodeURIComponent(body)}`
		);
	});

	test("disabled", () => {
		const recipient = "test@example.com";
		const text = "Test Me";
		const body = "words";
		render(
			<MailToLink
				text={text}
				recipient={recipient}
				subject={body}
				body={body}
				disabled
			/>
		);
		expect(screen.getByRole("link", { name: text })).toHaveAttribute(
			"aria-disabled",
			"true"
		);
	});

	test("iconButton with label", () => {
		const recipient = "test@example.com";
		const text = "Test Me";
		const body = "words";
		render(
			<MailToLink
				iconButton
				text={text}
				recipient={recipient}
				subject={body}
				body={body}
			/>
		);
		expect(screen.getByRole("link", { name: text })).toBeInTheDocument();
	});

	test("iconButton disabled", () => {
		const recipient = "test@example.com";
		const text = "Test Me";
		const body = "words";
		render(
			<MailToLink
				iconButton
				text={text}
				recipient={recipient}
				subject={body}
				body={body}
				disabled
			/>
		);
		expect(screen.getByRole("link", { name: text })).toHaveAttribute(
			"aria-disabled",
			"true"
		);
	});
});
