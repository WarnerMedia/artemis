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
import { CheckCircleOutline as CheckCircleOutlineIcon } from "@mui/icons-material";
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
		"& > :not(:first-of-type)": {
			marginLeft: theme.spacing(1),
		},
	},
}));

const WelcomeDialog = (props: {
	open: boolean;
	onOk: any;
	children: React.ReactNode;
	title: string;
	okText?: React.ReactNode;
	onCancel?: any;
}) => {
	const { i18n } = useLingui();
	const { classes } = useStyles();
	const { open, onOk, children, title, okText, onCancel } = props;
	const [hideWelcome, setHideWelcome] = useState(false);

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setHideWelcome(event.target.checked);
	};

	const handleOk = () => {
		onOk(hideWelcome);
	};

	const handleCancel = () => {
		setHideWelcome(false);
		onCancel();
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
						{okText ? (
							<Button
								onClick={handleOk}
								variant="contained"
								startIcon={<CheckCircleOutlineIcon />}
							>
								{okText}
							</Button>
						) : (
							<Button color="primary" onClick={handleOk}>
								<Trans>OK</Trans>
							</Button>
						)}
						{onCancel && (
							<Button color="primary" onClick={handleCancel}>
								<Trans>Cancel</Trans>
							</Button>
						)}
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
