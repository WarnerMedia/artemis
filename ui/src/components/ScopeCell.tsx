import { Tooltip } from "@mui/material";
import { Trans } from "@lingui/macro";

const ScopeCell = (props: { value?: string | string[] | null }) => {
	const { value } = props;
	const files = <></>;
	if (value) {
		if (Array.isArray(value)) {
			const count = value.length;
			if (count === 1) {
				return (
					<>
						<Tooltip describeChild title={value[0]}>
							<span>{value[0]}</span>
						</Tooltip>
					</>
				);
			}
			if (count > 1) {
				return (
					<>
						<Tooltip describeChild title={value.join(", ")}>
							<span>
								{value[0]} + <Trans>{count - 1} more</Trans>
							</span>
						</Tooltip>
					</>
				);
			}
		} else {
			return (
				<>
					<Tooltip describeChild title={value}>
						<span>{value}</span>
					</Tooltip>
				</>
			);
		}
	}
	return files;
};
export default ScopeCell;
