import { useSelector } from "react-redux";
import {
	Button,
	Dialog,
	DialogContent,
	DialogContentText,
} from "@mui/material";
import { FirstPage as FirstPageIcon } from "@mui/icons-material";
import { Trans } from "@lingui/macro";

import { selectGlobalException } from "features/globalException/globalExceptionSlice";

// Component for displaying a single global exception in a modal dialog window
// there is no dialog title or action buttons
const GlobalException = () => {
	const exception = useSelector(selectGlobalException);

	return (
		<Dialog
			open={!!exception.message}
			aria-describedby="alert-dialog-description"
		>
			<DialogContent>
				<DialogContentText id="alert-dialog-description">
					{exception.message}
				</DialogContentText>
				{exception?.action === "login" && (
					<Button
						startIcon={<FirstPageIcon />}
						href={window.location.href}
						size="small"
					>
						<Trans>Return to login</Trans>
					</Button>
				)}
			</DialogContent>
		</Dialog>
	);
};
export default GlobalException;
