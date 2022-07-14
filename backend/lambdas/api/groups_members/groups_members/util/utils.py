def parse_body_for_groups_members(body):
    email_group_dict = {}
    for member_record in body:
        email_group_dict[member_record["email"]] = member_record.get("group_admin", False)
    return email_group_dict
