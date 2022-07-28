import { Trans, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import {
	Box,
	Button,
	Checkbox,
	DialogActions,
	DialogContent,
	FormControlLabel,
} from "@mui/material";
import { makeStyles } from "tss-react/mui";
import DraggableDialog from "components/DraggableDialog";
import { useState } from "react";

const useStyles = makeStyles()((theme) => ({
	dialogActions: {
		justifyContent: "space-between",
		marginLeft: theme.spacing(2),
	},
	// matches MUI DialogActions
	viewActions: {
		flex: "0 0 auto",
		display: "flex",
		padding: "8px",
		alignItems: "center",
		justifyContent: "space-between",
		"& > *": {
			marginLeft: theme.spacing(1),
		},
	},
}));

const WelcomeDialog = (props: {
	open: boolean;
	onClose: any;
	children: React.ReactNode;
	title: string;
}) => {
	const { i18n } = useLingui();
	const { classes } = useStyles();
	const { open, onClose, children, title } = props;
	const [hideWelcome, setHideWelcome] = useState(false);

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setHideWelcome(event.target.checked);
	};

	const handleClose = () => {
		onClose(hideWelcome);
	};

	const dialogContent = () => {
		return (
			<>
				<DialogContent dividers={true}>{children}</DialogContent>
				<DialogActions className={classes.dialogActions}>
					<Box>
						<FormControlLabel
							control={
								<Checkbox
									autoFocus
									checked={hideWelcome}
									onChange={handleChange}
									name="hideWelcome"
									color="primary"
								/>
							}
							label={i18n._(t`Don't show this dialog again on this browser`)}
						/>
					</Box>
					<Box displayPrint="none" className={classes.viewActions}>
						<Button color="primary" onClick={handleClose}>
							<Trans>OK</Trans>
						</Button>
					</Box>
				</DialogActions>
			</>
		);
	};

	return (
		<DraggableDialog open={open} title={title} maxWidth="md" fullWidth={true}>
			<>{dialogContent()}</>
		</DraggableDialog>
	);
};
export default WelcomeDialog;
