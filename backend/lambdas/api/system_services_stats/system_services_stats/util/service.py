from artemisdb.artemisdb.models import User
from artemislib.logging import Logger

log = Logger(__name__)


def get_services(email: str):
    ret = []
    try:
        user = User.objects.get(email=email, deleted=False)
        for scan_org in user.scan_orgs:
            ret.append(scan_org)
        return ret
    except User.DoesNotExist:
        return []
