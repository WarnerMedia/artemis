import { render, screen } from "test-utils";
jest.mock("react-redux", () => ({
	...(jest.requireActual("react-redux") as any),
	__esModule: true,
	useSelector: jest.fn(),
	useDispatch: jest.fn(),
}));
/* eslint-disable */
import { useSelector, useDispatch } from "react-redux";
import { clearAllNotifications, clearNotification } from "./notificationsSlice";
import Notifications from "./Notifications";
import { APP_NOTIFICATION_DELAY } from "app/globals";

/* eslint-enable */
const initialState = {
	notifications: {
		entities: {
			Error: {
				message: "Error",
				type: "error",
			},
			Warning: {
				message: "Warning",
				type: "warning",
			},
			Success: {
				message: "Success",
				type: "success",
			},
			Info: {
				message: "Info",
				type: "info",
			},
			Error2: {
				message: "Error2",
				type: "error",
			},
			Success2: {
				message: "Success2",
				type: "success",
			},
		},
		ids: ["Error", "Warning", "Success", "Info", "Error2", "Success2"],
	},
};
// mock redux hooks
let mockAppState: any;
const mockUseSelector = useSelector as jest.Mock;
const mockUseDispatch = useDispatch as jest.Mock;
const mockDispatch = jest.fn();

describe("Notificaions component", () => {
	jest.setTimeout(90000);

	beforeEach(() => {
		mockUseSelector.mockImplementation((callback) => {
			return callback(mockAppState);
		});
		mockUseDispatch.mockImplementation(() => mockDispatch);
	});
	afterEach(() => {
		mockUseSelector.mockClear();
		mockUseDispatch.mockClear();
		// clear mockDispatch too or mock call counts will be inaccurate
		// will (bleed-over from prior tests)
		mockDispatch.mockClear();
	});

	it("should display all notifications in state", () => {
		mockAppState = JSON.parse(JSON.stringify(initialState));
		render(<Notifications />);
		expect(screen.getAllByRole("alert")).toHaveLength(
			mockAppState.notifications.ids.length
		);
		expect(screen.getAllByLabelText("error")).toHaveLength(2);
		expect(screen.getAllByLabelText("warning")).toHaveLength(1);
		expect(screen.getAllByLabelText("success")).toHaveLength(2);
		expect(screen.getAllByLabelText("info")).toHaveLength(1);

		expect(screen.getByText("Error")).toBeInTheDocument();
		expect(screen.getByText("Warning")).toBeInTheDocument();
		expect(screen.getByText("Success")).toBeInTheDocument();
		expect(screen.getByText("Info")).toBeInTheDocument();
		expect(screen.getByText("Error2")).toBeInTheDocument();
		expect(screen.getByText("Success2")).toBeInTheDocument();
	});

	it("should display 0 notifications for empty state", () => {
		mockAppState = {
			notifications: {
				entities: {},
				ids: [],
			},
		};
		render(<Notifications />);
		expect(screen.queryAllByRole("alert")).toHaveLength(0);
	});

	it("close button should dismiss a single notification", async () => {
		mockAppState = JSON.parse(JSON.stringify(initialState));
		const { user } = render(<Notifications />);
		const closeButtons = screen.getAllByRole("button", { name: /close/i });
		await user.click(closeButtons[0]);

		// first notifications should be dismissed
		expect(mockDispatch).toHaveBeenCalledWith(clearNotification("Error"));
	});

	it("notifications should not be dismissed if it contains errors", () => {
		jest.useFakeTimers();
		mockAppState = {
			notifications: {
				entities: {
					Error: {
						message: "Error",
						type: "error",
					},
					Success: {
						message: "Success",
						type: "success",
					},
					Info: {
						message: "Info",
						type: "info",
					},
					Success2: {
						message: "Success2",
						type: "success",
					},
				},
				ids: ["Error", "Success", "Info", "Success2"],
			},
		};

		render(<Notifications />);
		jest.advanceTimersByTime(APP_NOTIFICATION_DELAY + 1000); // all messages should have been dismissed delay +1 second

		expect(screen.getAllByRole("alert")).toHaveLength(
			mockAppState.notifications.ids.length
		);

		// notifications should not be auto-dismissed
		expect(mockDispatch).not.toHaveBeenCalledWith(clearAllNotifications());
	});

	it("notifications should not be dismissed if it contains warnings", () => {
		jest.useFakeTimers();
		mockAppState = {
			notifications: {
				entities: {
					Warning: {
						message: "Warning",
						type: "error",
					},
					Success: {
						message: "Success",
						type: "success",
					},
					Info: {
						message: "Info",
						type: "info",
					},
					Success2: {
						message: "Success2",
						type: "success",
					},
				},
				ids: ["Warning", "Success", "Info", "Success2"],
			},
		};

		render(<Notifications />);
		jest.advanceTimersByTime(APP_NOTIFICATION_DELAY + 1000); // all messages should have been dismissed delay +1 second

		expect(screen.getAllByRole("alert")).toHaveLength(
			mockAppState.notifications.ids.length
		);

		// notifications should not be auto-dismissed
		expect(mockDispatch).not.toHaveBeenCalledWith(clearAllNotifications());
	});

	it("all notifications should be dismissed if there are no errors or warnings", () => {
		jest.useFakeTimers();
		mockAppState = {
			notifications: {
				entities: {
					Success: {
						message: "Success",
						type: "success",
					},
					Info: {
						message: "Info",
						type: "info",
					},
					Success2: {
						message: "Success2",
						type: "success",
					},
				},
				ids: ["Success", "Info", "Success2"],
			},
		};

		render(<Notifications />);
		jest.advanceTimersByTime(APP_NOTIFICATION_DELAY + 1000); // all messages should have been dismissed delay +1 second

		expect(screen.getAllByRole("alert")).toHaveLength(
			mockAppState.notifications.ids.length
		);

		// all notifications should be auto-dismissed
		expect(mockDispatch).toHaveBeenCalledWith(clearAllNotifications());
	});

	it("notification should not close if click is outside close button (clickaway)", async () => {
		jest.useFakeTimers();
		mockAppState = JSON.parse(JSON.stringify(initialState));
		// because fake timers are used in test, these need to be passed to user-event setup options, see:
		// https://github.com/testing-library/user-event/issues/959#issuecomment-1127781872
		const { user } = render(
			<div data-testid="outer-element">
				<Notifications />
			</div>,
			null,
			{
				advanceTimers: jest.advanceTimersByTime,
			}
		);
		jest.clearAllTimers();
		await user.click(screen.getByTestId("outer-element"));

		expect(mockDispatch).not.toHaveBeenCalled();
	});
});
