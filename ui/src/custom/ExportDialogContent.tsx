import { Trans } from "@lingui/macro";
import { Typography } from "@mui/material";

const ExportDialogContent = () => (
	<>
		<Typography variant="body1" gutterBottom marginBottom={4}>
			<Trans>
				You are about to download Artemis scan data. REPLACE ME: ADD ANY
				ADDITIONAL INFORMATION HERE.
			</Trans>
		</Typography>
		<Typography variant="body1" gutterBottom>
			<Trans>To proceed, click “I Acknowledge" below.</Trans>
		</Typography>
	</>
);
export default ExportDialogContent;
