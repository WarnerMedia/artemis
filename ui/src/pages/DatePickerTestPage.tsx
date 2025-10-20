import { t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { Box, Button, Paper } from "@mui/material";
import DatePickerField from "components/FormikPickers";
import { Field, Form, Formik } from "formik";

const DatePickerTestPage = () => {
	const { i18n } = useLingui();

	return (
		<Paper sx={{ p: 2 }}>
			<h1>DatePickerField Test Page</h1>
			<Formik
				initialValues={{ test_date: null }}
				noValidation
				onSubmit={(values) => {
					console.log("Form submitted with values:", values);
					alert(
						`Form submitted! Check the console for the selected date object.`,
					);
				}}
			>
				{({ submitForm, values }) => (
					<Form>
						<Box sx={{ mb: 2 }}>
							<Field
								id="test_date"
								name="test_date"
								label={i18n._(t`Test Date Picker`)}
								component={DatePickerField}
								format="yyyy/LL/dd HH:mm"
								mask="____/__/__ __:__"
								ampm={false}
							/>
						</Box>
						<Button variant="contained" color="primary" onClick={submitForm}>
							Submit
						</Button>
						<Box sx={{ mt: 2 }}>
							<pre>{JSON.stringify(values, null, 2)}</pre>
						</Box>
					</Form>
				)}
			</Formik>
		</Paper>
	);
};

export default DatePickerTestPage;
