import TextField from "@mui/material/TextField";
import { DateTime } from "luxon";
import { FieldProps, getIn } from "formik";
import {
	DesktopDateTimePicker,
	DateTimePickerProps,
} from "@mui/x-date-pickers";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/macro";
import { useState } from "react";

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
		DateTimePickerProps<any, any> {
	id?: string;
	getShouldDisableDateError: (date: Date) => string;
	placeholder?: string;
	size?: "small" | "medium";
	style?: React.CSSProperties;
	// allow overriding default error messages
	// carry-over from legacy KeyboardDateTimePicker
	invalidDateMessage?: string;
	minDateMessage?: string;
	maxDateMessage?: string;
}

// for picker format argument, see:
// https://moment.github.io/luxon/#/formatting?id=table-of-tokens
const DatePickerField = (props: DatePickerFieldProps) => {
	const { i18n } = useLingui();
	const {
		field,
		form,
		getShouldDisableDateError,
		renderInput,
		onChange,
		value,
		invalidDateMessage,
		minDateMessage,
		maxDateMessage,
		...other
	} = props;
	const [muiError, setMuiError] = useState<string | null>(null);
	const formikError = getIn(form.errors, field.name);
	const hasError = formikError ?? muiError;

	// explicitly use the _Desktop_ variant of DateTimePicker, i.e., DesktopDateTimePicker
	// Using the generic DateTimePicker component causes the variant (Desktop or Mobile) to be automatically resolved based on media queries
	// UI has not yet been tested on mobile and there are some significant differences to Desktop picker that cause unit tests to fail
	return (
		<DesktopDateTimePicker
			componentsProps={{
				actionBar: {
					actions: ["clear", "cancel", "accept"],
				},
			}}
			value={field.value}
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
				let dt: any;
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
							if (props?.inputFormat) {
								format = dt.toFormat(props.inputFormat);
							} else {
								format = dt.toLocaleString(
									props?.maxDate ? DateTime.DATE_SHORT : DateTime.DATETIME_SHORT
								);
							}
							error = i18n._(t`Date can not be after ${format}`);
						}
						break;
					}
					case "minDate": {
						if (minDateMessage) {
							error = minDateMessage;
						} else {
							dt = props?.minDate ?? props?.minDateTime;
							if (props?.inputFormat) {
								format = dt.toFormat(props.inputFormat);
							} else {
								format = dt.toLocaleString(
									props?.minDate ? DateTime.DATE_SHORT : DateTime.DATETIME_SHORT
								);
							}
							error = i18n._(t`Date can not be before ${format}`);
						}
						break;
					}
					case "maxTime": {
						if (maxDateMessage) {
							error = maxDateMessage;
						} else {
							dt = props?.maxTime ?? props?.maxDateTime;
							if (props?.inputFormat) {
								format = dt.toFormat(props.inputFormat);
							} else {
								format = dt.toLocaleString(
									props?.maxTime
										? DateTime.TIME_SIMPLE
										: DateTime.DATETIME_SHORT
								);
							}
							error = props?.maxTime
								? i18n._(t`Time can not be after ${format}`)
								: i18n._(t`Date can not be after ${format}`);
						}
						break;
					}
					case "minTime": {
						if (minDateMessage) {
							error = minDateMessage;
						} else {
							dt = props?.minTime ?? props?.minDateTime;
							if (props?.inputFormat) {
								format = dt.toFormat(props.inputFormat);
							} else {
								format = dt.toLocaleString(
									props?.minTime
										? DateTime.TIME_SIMPLE
										: DateTime.DATETIME_SHORT
								);
							}
							error = props?.minTime
								? i18n._(t`Time can not be before ${format}`)
								: i18n._(t`Date can not be before ${format}`);
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
			toolbarTitle={props?.toolbarTitle ?? i18n._(t`Select date`)}
			renderInput={(inputProps) => {
				if (props?.placeholder && inputProps?.inputProps) {
					inputProps.inputProps.placeholder = props.placeholder;
				}
				if (props?.id && inputProps?.inputProps) {
					inputProps.inputProps.id = props.id;
				}
				return (
					<TextField
						name={field.name}
						{...inputProps}
						InputLabelProps={{ htmlFor: props.id }}
						style={props.style ?? undefined}
						size={props.size ?? "medium"}
						error={Boolean(hasError)}
						helperText={hasError ?? inputProps.helperText}
						onBlur={() => {
							form.setFieldTouched(field.name, true, false);
							if (muiError) {
								form.setFieldError(field.name, muiError);
							} else {
								form.validateField(field.name);
							}
						}}
					/>
				);
			}}
			{...other}
		/>
	);
};
export default DatePickerField;
