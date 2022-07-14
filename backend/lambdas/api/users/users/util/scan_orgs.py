from artemisdb.artemisdb.models import UserService
from artemislib.logging import Logger

log = Logger(__name__)


def gather_service_scan_orgs(user_id: int) -> list:
    """
    Gather the current list of scan_orgs for a given user
    """
    user_services = UserService.objects.filter(user_id=user_id)
    orgs = []

    if user_services:
        for user_service in user_services:
            scan_orgs = user_service.scan_orgs
            orgs += scan_orgs.get("orgs")

    return orgs
