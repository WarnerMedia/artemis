import { DateTime } from "luxon";
import { AdapterLuxon as DateAdapter } from "@mui/x-date-pickers/AdapterLuxon";
import { FieldProps, getIn } from "formik";
import {
	DesktopDateTimePicker,
	DesktopDateTimePickerProps,
} from "@mui/x-date-pickers";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/macro";
import { useState } from "react";
import { browserLanguage } from "App";
import { InputBaseProps } from "@mui/material";

// Formik wrapper for Material UI date/time pickers
// adapted from Material-UI picker Formik sample:
// https://next.material-ui-pickers.dev/guides/forms#validation-props
//
// also adds i18n for component labels
//
// usage:
// <Field ...attrs component={DateTimePicker} />

interface DatePickerFieldProps
	extends FieldProps,
		DesktopDateTimePickerProps<DateTime> {
	id?: string;
	getShouldDisableDateError: (date: DateTime | null) => string;
	size?: "small" | "medium";
	style?: React.CSSProperties;
	// allow overriding default error messages
	// carry-over from legacy KeyboardDateTimePicker
	invalidDateMessage?: string;
	minDateMessage?: string;
	maxDateMessage?: string;
	placeholder?: string;
	helperText?: string;
}

// for picker format argument, see:
// https://moment.github.io/luxon/#/formatting?id=table-of-tokens
const DatePickerField = (props: DatePickerFieldProps) => {
	const { i18n } = useLingui();
	const {
		field,
		form,
		getShouldDisableDateError,
		onChange,
		invalidDateMessage,
		minDateMessage,
		maxDateMessage,
		...other
	} = props;
	const [muiError, setMuiError] = useState<string | null>(null);
	const formikError = getIn(form.errors, field.name);
	const hasError = formikError ?? muiError;
	const localeText = props.localeText ? { ...props.localeText } : {};
	if (!localeText?.toolbarTitle) {
		localeText.toolbarTitle = i18n._(t`Select date`);
	}
	if (!localeText?.cancelButtonLabel) {
		localeText.cancelButtonLabel = i18n._(t`Cancel`);
	}
	if (!localeText?.clearButtonLabel) {
		localeText.clearButtonLabel = i18n._(t`Clear`);
	}
	if (!localeText?.okButtonLabel) {
		localeText.okButtonLabel = i18n._(t`OK`);
	}
	if (!localeText?.previousMonth) {
		localeText.previousMonth = i18n._(t`Previous month`);
	}
	if (!localeText?.nextMonth) {
		localeText.nextMonth = i18n._(t`Next month`);
	}
	// x-date-pickers v6 expects the picker's field value to be in the adapter's date/time format - it no longer performs this conversion
	// so this wrapper will now handle this conversion
	// Luxon adapter doesn't accept Date objects, so convert to a string first.
	if (field.value && typeof field.value.toISOString === "function") {
		field.value = field.value.toISOString();
	}
	const adapter = new DateAdapter({ locale: browserLanguage });
	const fieldValue = adapter.date(field.value);

	// for a11y assign an additional title to the input field separate from the value, since v6 x-date-pickers picker value contains additional non-display characters
	// const displayValue = fieldValue
	// 	? fieldValue.toFormat(other.format ?? "yyyy/LL/dd HH:mm")
	// 	: "";
	const displayValue = "";
	const inputProps: InputBaseProps["inputProps"] = {
		id: props.id,
		title: displayValue,
	};
	if (props.placeholder) {
		inputProps.placeholder = props.placeholder;
	}

	// explicitly use the _Desktop_ variant of DateTimePicker, i.e., DesktopDateTimePicker
	// Using the generic DateTimePicker component causes the variant (Desktop or Mobile) to be automatically resolved based on media queries
	// UI has not yet been tested on mobile and there are some significant differences to Desktop picker that cause unit tests to fail
	return (
		<DesktopDateTimePicker
			slotProps={{
				actionBar: {
					actions: ["clear", "cancel", "accept"],
				},
				textField: {
					name: field.name,
					InputLabelProps: { htmlFor: props.id },
					inputProps: inputProps,
					style: props.style ?? undefined,
					size: props.size ?? "medium",
					error: Boolean(hasError),
					helperText: hasError ?? props.helperText,
					onBlur: () => {
						form.setFieldTouched(field.name, true, false);
						if (muiError) {
							form.setFieldError(field.name, muiError);
						} else {
							form.validateField(field.name);
						}
					},
				},
			}}
			value={fieldValue}
			label={props?.label}
			onChange={(date) => {
				form.setFieldTouched(field.name, true, false);
				if (muiError) {
					form.setFieldValue(field.name, date, false);
					form.setFieldError(field.name, muiError);
				} else {
					form.setFieldValue(field.name, date, true);
				}
			}}
			onError={(code, value) => {
				// map error enum to a formik field error
				let dt: DateTime | undefined;
				let format: string;
				let error: string | null = null;

				switch (code) {
					case "invalidDate": {
						error = invalidDateMessage
							? invalidDateMessage
							: i18n._(t`Invalid date format`);
						break;
					}
					case "disablePast": {
						error = minDateMessage
							? minDateMessage
							: i18n._(t`Must be a future date`);
						break;
					}
					case "disableFuture": {
						error = maxDateMessage
							? maxDateMessage
							: i18n._(t`Must be a past date`);
						break;
					}
					case "maxDate": {
						if (maxDateMessage) {
							error = maxDateMessage;
						} else {
							dt = props?.maxDate ?? props?.maxDateTime;
							if (dt) {
								if (props?.format) {
									format = dt.toFormat(props.format);
								} else {
									format = dt.toLocaleString(
										props?.maxDate
											? DateTime.DATE_SHORT
											: DateTime.DATETIME_SHORT,
									);
								}
								error = i18n._(t`Date can not be after ${format}`);
							}
						}
						break;
					}
					case "minDate": {
						if (minDateMessage) {
							error = minDateMessage;
						} else {
							dt = props?.minDate ?? props?.minDateTime;
							if (dt) {
								if (props?.format) {
									format = dt.toFormat(props.format);
								} else {
									format = dt.toLocaleString(
										props?.minDate
											? DateTime.DATE_SHORT
											: DateTime.DATETIME_SHORT,
									);
								}
								error = i18n._(t`Date can not be before ${format}`);
							}
						}
						break;
					}
					case "maxTime": {
						if (maxDateMessage) {
							error = maxDateMessage;
						} else {
							dt = props?.maxTime ?? props?.maxDateTime;
							if (dt) {
								if (props?.format) {
									format = dt.toFormat(props.format);
								} else {
									format = dt.toLocaleString(
										props?.maxTime
											? DateTime.TIME_SIMPLE
											: DateTime.DATETIME_SHORT,
									);
								}
								error = props?.maxTime
									? i18n._(t`Time can not be after ${format}`)
									: i18n._(t`Date can not be after ${format}`);
							}
						}
						break;
					}
					case "minTime": {
						if (minDateMessage) {
							error = minDateMessage;
						} else {
							dt = props?.minTime ?? props?.minDateTime;
							if (dt) {
								if (props?.format) {
									format = dt.toFormat(props.format);
								} else {
									format = dt.toLocaleString(
										props?.minTime
											? DateTime.TIME_SIMPLE
											: DateTime.DATETIME_SHORT,
									);
								}
								error = props?.minTime
									? i18n._(t`Time can not be before ${format}`)
									: i18n._(t`Date can not be before ${format}`);
							}
						}
						break;
					}
					case "shouldDisableDate": {
						// shouldDisableDate returned true, render custom message according to the `shouldDisableDate` logic
						error = getShouldDisableDateError(value);
						break;
					}
					default: {
						// null indicates there isn't a validation error, so clear existing form error for this field
						setMuiError(null);
						const newErrors = {
							...form.errors,
						};
						delete newErrors[field.name];
						form.setErrors({
							...newErrors,
						});
						form.setFieldValue(field.name, value, true);
					}
				}
				if (error) {
					setMuiError(error);
					form.setFieldError(field.name, error);
				}
			}}
			localeText={localeText}
			{...other}
		/>
	);
};
export default DatePickerField;
