import React from "react";

interface DevFeatureProps {
	children: React.ReactNode;
}

// Component that shows children in dev/test mode but hides in production
// Use for testing new features before release
const DevFeature = (props: DevFeatureProps) => {
	const children = process.env.NODE_ENV !== "production" ? props.children : "";

	return <>{children}</>;
};
export default DevFeature;
