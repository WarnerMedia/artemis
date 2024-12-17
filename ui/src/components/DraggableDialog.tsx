import React from "react";
import {
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogProps,
	DialogTitle,
	Paper,
	PaperProps,
} from "@mui/material";
import { makeStyles } from "tss-react/mui";
import { DragHandle as DragHandleIcon } from "@mui/icons-material";
import Draggable from "react-draggable";
import { Trans } from "@lingui/macro";

import CustomCopyToClipboard from "components/CustomCopyToClipboard";

const useStyles = makeStyles()((theme) => ({
	dialogContent: {
		paddingTop: theme.spacing(1),
		minHeight: "15em",
	},
	dialogHandle: {
		position: "absolute",
		right: theme.spacing(1),
		top: theme.spacing(1),
		color: theme.palette.grey[500],
	},
	dialogTitle: {
		paddingBottom: theme.spacing(1),
	},
}));

const titleId = "draggable-dialog-title";
const handleId = "draggable-dialog-handle";

function PaperComponent(props: PaperProps) {
	// This is to quiet strict mode warnings about findDOMNode usage. See
	// https://stackoverflow.com/a/63603903/12162258 for details
	const nodeRef = React.useRef(null);

	return (
		<Draggable
			handle={`#${handleId}`}
			cancel={'[class*="MuiDialogContent-root"]'}
			nodeRef={nodeRef}
		>
			<Paper ref={nodeRef} {...props} />
		</Draggable>
	);
}

interface DraggableDialogProps extends Omit<DialogProps, "content"> {
	actions?: React.ReactNode; // use custom actions, otherwise defaults to an OK button that closes dialog (do not need to include <DialogActions>)
	content?: React.ReactNode; // dialog content (do not need to include <DialogContent>)
	copyTitle?: boolean; // whether dialog title includes a CopyToClipboard option
	onClose?: any;
	title: string;
}

const DraggableDialog = (props: DraggableDialogProps) => {
	const { classes } = useStyles();
	const {
		actions,
		children,
		content,
		copyTitle = false,
		onClose,
		title,
		...dialogProps
	} = props;

	const handleClose = (_event: object, reason: string) => {
		return reason === "backdropClick" ? false : true;
	};

	return (
		<Dialog
			{...dialogProps}
			onClose={handleClose}
			PaperComponent={PaperComponent}
			aria-labelledby={titleId}
		>
			<DialogTitle className={classes.dialogTitle}>
				<span id={titleId}>{title}</span>
				{copyTitle && (
					<CustomCopyToClipboard aria-hidden={true} copyTarget={title} />
				)}
				<DragHandleIcon
					className={classes.dialogHandle}
					style={{ cursor: "move" }}
					id={handleId}
				/>
			</DialogTitle>
			{children ? (
				children
			) : (
				<>
					<DialogContent className={classes.dialogContent} dividers={true}>
						<>{content}</>
					</DialogContent>
					<DialogActions>
						{actions
							? actions
							: onClose && (
									<Box displayPrint="none">
										<Button color="primary" autoFocus onClick={onClose}>
											<Trans>OK</Trans>
										</Button>
									</Box>
								)}
					</DialogActions>
				</>
			)}
		</Dialog>
	);
};
export default DraggableDialog;
