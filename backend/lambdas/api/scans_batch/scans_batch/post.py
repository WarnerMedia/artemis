import uuid

from artemisapi.response import response
from artemisapi.validators import ValidationError
from artemisdb.artemisdb.models import Group, ScanBatch, User
from scans_batch.util.events import ParsedEvent


def post(event, principal: dict = None, **kwargs):
    try:
        parsed_event = ParsedEvent(event, parse_body=True)
    except ValidationError as e:
        return response({"message": e.message}, code=e.code)

    group = None
    try:
        if principal["type"] == "group_api_key":
            group = Group.objects.get(group_id=principal["id"])
        elif principal["type"] in ("user", "user_api_key"):
            group = User.objects.get(email=principal["id"]).self_group
    except (User.DoesNotExist, Group.DoesNotExist):
        pass

    batch = ScanBatch.objects.create(batch_id=uuid.uuid4(), description=parsed_event.description, created_by=group)

    return response(batch.to_dict())
