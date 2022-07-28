import { Tooltip } from "@mui/material";

const TooltipCell = (props: { value?: string | null }) => {
	const { value } = props;
	if (value) {
		return (
			<Tooltip describeChild title={value}>
				<span>{value}</span>
			</Tooltip>
		);
	}
	return <></>;
};
export default TooltipCell;
