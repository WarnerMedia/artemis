import { render, screen } from "test-utils";
import MailToLink from "./MailToLink";
import { APP_EMAIL_AUTHOR } from "app/globals";

const DEFAULT_RECIPIENT = APP_EMAIL_AUTHOR;

describe("MailToLink component", () => {
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
		])("recipient %p", (recipient) => {
			render(<MailToLink recipient={recipient} text={recipient} />);

			screen.getByText(recipient.replace(/_DELETED_[0-9]+$/, " (Deleted)"));
			// no link
			expect(screen.queryByRole("link")).not.toBeInTheDocument();
		});
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

	test("deleted recipient marked (Deleted)", () => {
		const recipient = "username@example.com";
		const text = recipient + "_DELETED_12345678";
		render(<MailToLink text={text} recipient={text} />);
		const expected = `${recipient} (Deleted)`;
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
		const expected = `${recipient} (Deleted)`;
		screen.getByText(expected);
		// no link since user is deleted, shouldn't have a valid email address
		expect(screen.queryByRole("link")).not.toBeInTheDocument();

		// there should be a tooltip
		expect(screen.getByTitle(expected)).toBeInTheDocument();
	});

	test("deleted group name marked (Deleted)", () => {
		const recipient = "I Am a Group";
		const text = recipient + "_DELETED_12345678";
		render(<MailToLink text={text} recipient={text} />);
		const expected = `${recipient} (Deleted)`;
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
		const expected = `${recipient} (Deleted)`;
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
});
