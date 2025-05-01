def parse_cli_output(output_list):
    """
    parses the text string output of the findsecbugs analysis cli
    :param output_list: list of string results
    :return: list of parsed output dictionaries
    """
    cli_output = []
    for output in output_list:
        output_type, message_and_file, line_text = parse_line(output)
        try:
            line = int(line_text.replace("[line ", "").replace("]", ""))
        except ValueError:
            line = None
        message, filename = parse_message_and_file(message_and_file)
        item = {
            "filename": filename,
            "message": message.strip(),
            "line": line,
            "type": output_type,
        }
        cli_output.append(item)
    return cli_output


def parse_line(output: str) -> tuple[str, str, str]:
    seperator = ":"

    split = output.split(seperator)
    split_len = len(split)

    if split_len >= 3:
        output_type = split[0]
        message_and_file = seperator.join(split[1:-1])
        line_text = split[-1]
    elif split_len == 2:
        output_type, message_and_file = split
        # In at least one case, split_len is 2 because no line number is provided.
        # So, we set `line_text` to empty string
        line_text = ""
    else:  # split_len < 2
        raise Exception(f'Unexpected case. 1 or fewer "{seperator}" in output line: {output}')

    return output_type, message_and_file, line_text


def parse_message_and_file(output: str) -> tuple[str, str]:
    seperator = "At "

    split = output.split(seperator)

    if len(split) >= 2:
        message = seperator.join(split[0:-1])
        filename = split[-1]
    else:
        message = output
        filename = "Not provided"

    return message, filename


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
