import { t } from "@lingui/macro";
import { ThemeColors } from "features/theme/themeSchemas";

interface IThemeColorProps extends Omit<ThemeColors, "name"> {
	displayName: string;
	preview: string;
}

export interface IThemeColors {
	prism: IThemeColorProps;
	red: IThemeColorProps;
	orange: IThemeColorProps;
	yellow: IThemeColorProps;
	teal: IThemeColorProps;
	blue: IThemeColorProps;
	purple: IThemeColorProps;
}

export const themeColors: IThemeColors = {
	prism: {
		displayName: t`Prism`,
		preview:
			"linear-gradient(75deg, rgba(26,101,252,1) 0%, rgba(19,179,208,1) 19%, rgba(158,157,237,1) 42%, rgba(186,117,255,1) 58%, rgba(255,128,13,1) 75%, rgba(255,67,67,1) 87%)",
		dark: "#20B9AC",
		light: "#FF800D", // should light use same color as main?
		main: "#d151b0",
		gradient:
			"linear-gradient(75deg, rgba(26,101,252,1) 0%, rgba(19,179,208,1) 19%, rgba(158,157,237,1) 42%, rgba(186,117,255,1) 58%, rgba(255,128,13,1) 75%, rgba(255,67,67,1) 87%)",
		gradientText: "white",
	},
	red: {
		displayName: t`Red`,
		preview: "#FF4343",
		dark: "#FF800D",
		light: "#FF8E8E",
		main: "#FF4343",
		gradient:
			"radial-gradient(circle, rgba(218,46,120,1) 0%, rgba(234,38,40,1) 27%, rgba(255,67,67,1) 66%, rgba(255,122,66,1) 97%)",
		gradientText: "white",
	},
	orange: {
		displayName: t`Orange`,
		preview: "#FF800D",
		dark: "#FF4343",
		light: "#FFCC9E",
		main: "#FF800D",
		gradient:
			"linear-gradient(315deg, rgba(244,183,6,1) 0%, rgba(255,128,13,1) 26%, rgba(255,87,11,1) 65%, rgba(255,31,23,1) 100%)",
		gradientText: "white",
	},
	yellow: {
		displayName: t`Yellow`,
		preview: "#F4B706",
		dark: "#FF800D",
		light: "#FDE399",
		main: "#F4B706",
		gradient:
			"radial-gradient(circle, rgba(255,129,3,1) 0%, rgba(255,163,7,1) 36%, rgba(252,210,57,1) 87%, rgba(252,210,57,1) 97%)",
		gradientText: "rgba(0, 0, 0, 0.87)",
	},
	teal: {
		displayName: t`Teal`,
		preview: "#20B9AC",
		dark: "#13B3D0",
		light: "#9BEEE7",
		main: "#20B9AC",
		gradient:
			"linear-gradient(315deg, rgba(201,211,203,1) 0%, rgba(63,201,189,1) 21%, rgba(18,167,188,1) 70%, rgba(0,134,201,1) 100%)",
		gradientText: "white",
	},
	blue: {
		displayName: t`Blue`,
		preview: "#13B3D0",
		dark: "#2A74C6",
		light: "#86BEE8",
		main: "#13B3D0",
		gradient:
			"radial-gradient(circle, rgba(19,179,208,1) 0%, rgba(20,187,212,1) 40%, rgba(32,136,202,1) 77%, rgba(76,50,185,1) 100%)",
		gradientText: "white",
	},
	purple: {
		displayName: t`Purple`,
		preview: "#d151b0",
		dark: "#6600CC",
		light: "#d151b0",
		main: "#d151b0",
		gradient:
			"radial-gradient(circle at 33% 125%, #d151b0 5%, transparent 60%),radial-gradient(circle at 110% -25%, #d151b0, transparent 50%), #6600CC",
		gradientText: "white",
	},
};
export const defaultTheme = "purple";

export const colorPriority = "#660066"; // plum purple
export const colorCritical = "#820040"; // claret
export const colorHigh = "#d90000"; // red
export const colorMedium = "#ff8e29"; // dark orange
export const colorLow = "#f8ce58"; // yellow
export const colorNegligible = "#e0e0e0"; // grey

export const colorTech = "grey";
export const colorImages = "lightgrey";
