import { makeStyles } from "tss-react/mui";
import { Typography } from "@mui/material";
import { Trans } from "@lingui/macro";

const useStyles = makeStyles()(() => ({
	pageFooter: {
		textAlign: "center",
		fontSize: "smaller",
		paddingTop: "1rem",
		paddingBottom: "1rem",
		position: "relative",
		display: "block",
		bottom: "0px",
	},
}));

interface IFooter {
	year: number;
	version: string;
	className?: string;
}
const Footer = (props: IFooter) => {
	const { classes, cx } = useStyles();
	return (
		<>
			<footer
				aria-label="footer"
				className={cx(classes.pageFooter, props.className)}
			>
				<Typography component="p" variant="caption">
					<Trans>
						v{props.version} ({props.year}), REPLACE ME: ADD A PAGE FOOTER HERE
					</Trans>
				</Typography>
			</footer>
		</>
	);
};

export default Footer;
