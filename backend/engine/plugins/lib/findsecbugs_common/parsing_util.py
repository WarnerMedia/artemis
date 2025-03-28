def parse_cli_output(output_list):
    """
    parses the text string output of the findsecbugs analysis cli
    :param output_list: list of string results
    :return: list of parsed output dictionaries
    """
    cli_output = []
    for output in output_list:
        result = output.split(":")
        if len(result) == 3:
            output_type, message_and_file, line_text = output.split(":")
        else:
            output_type = result[0]
            message_and_file = result[1]
            line_text = result[3]
        output_type, message_and_file, line_text = output.split(":")
        try:
            line = int(line_text.replace("[line ", "").replace("]", ""))
        except ValueError:
            line = None
        message, filename = message_and_file.split("At ")
        item = {
            "filename": filename,
            "message": message.strip(),
            "line": line,
            "type": output_type,
        }
        cli_output.append(item)
    return cli_output


def parse_cli_results(cli_results):
    """
    parses the findsecbugs analysis cli results
    :param cli_results: list of jar analysis results
    :return: bool, list
    """
    success = True
    output_list = []
    for result_dict in cli_results:
        if not result_dict["status"] or len(result_dict["output"]) > 0:
            success = False
        jar_output = parse_cli_output(result_dict["output"])
        if jar_output:
            output_list.extend(jar_output)
    return success, output_list
