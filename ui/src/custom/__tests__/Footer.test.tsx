import { APP_VERSION } from "app/globals";
import { render, screen } from "test-utils";
import Footer from "custom/Footer";

test("displays footer", () => {
	const year: number = new Date().getFullYear();
	render(<Footer year={year} version={APP_VERSION} />);

	expect(screen.getByLabelText("footer")).toBeInTheDocument();
	expect(screen.getByLabelText("footer")).toHaveTextContent(year.toString());
	expect(screen.getByLabelText("footer")).toHaveTextContent(APP_VERSION);
});
