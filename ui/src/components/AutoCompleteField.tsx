import { Field, FieldAttributes } from "formik";
import { TextField as MuiTextField } from "@mui/material";
import { LinearProgress } from "@mui/material";
import { Autocomplete, AutocompleteRenderInputParams } from "formik-mui";
import parse from "autosuggest-highlight/parse";
import match from "autosuggest-highlight/match";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/macro";
import React from "react";

export interface AutoCompleteFieldProps extends FieldAttributes<any> {
	loading?: boolean; // show a loading indicator
}

const AutoCompleteField = React.forwardRef(
	(props: AutoCompleteFieldProps, ref?: any) => {
		const { i18n } = useLingui();
		const { loading = false, ...allParams } = props;
		// remove N/A params for the Formik Field
		const { helperText, error, InputProps, ...fieldParams } = allParams;

		return (
			<>
				{loading && <LinearProgress id="options-loading" />}
				<Field
					component={Autocomplete}
					{...fieldParams}
					aria-describedby="options-loading"
					aria-busy={loading}
					renderInput={(params: AutocompleteRenderInputParams) => {
						// allow augmentation of InputProps, such as with a startAdornment
						const InputProps = {
							...params.InputProps,
							...allParams?.InputProps,
						};
						return (
							<MuiTextField
								{...params}
								ref={ref}
								name={allParams.name}
								error={allParams.error}
								helperText={allParams.helperText}
								label={
									loading ? i18n._(t`Loading options...`) : allParams.label
								}
								placeholder={allParams.placeholder}
								variant="outlined"
								slotProps={{
									input: InputProps,
								}}
							/>
						);
					}}
					renderOption={(
						renderProps: any,
						option: any,
						{ inputValue }: { inputValue: string },
					) => {
						// highlight portion of Autocomplete results that match user text entered
						let optionLabel = option;
						// if the options are objects then use the object field identified by getOptionLabel
						if (props.getOptionLabel) {
							optionLabel = props.getOptionLabel(option);
						}
						const matches = match(optionLabel, inputValue);
						const parts = parse(optionLabel, matches);
						// don't pass key in with rest of props
						const { key, ...otherProps } = renderProps;
						return (
							<li key={key} {...otherProps}>
								<div>
									{parts.map((part, index) => (
										<span
											key={index}
											style={{
												fontWeight: part.highlight ? 700 : 400,
											}}
										>
											{part.text}
										</span>
									))}
								</div>
							</li>
						);
					}}
				/>
			</>
		);
	},
);
export default AutoCompleteField;
