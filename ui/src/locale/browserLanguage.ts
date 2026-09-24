// Shared browser locale used by date/time formatting and pickers.
// Keep this independent from App.tsx to avoid runtime import cycles.
export const browserLanguage =
	typeof navigator !== "undefined" && navigator.language
		? navigator.language
		: "en-US";
