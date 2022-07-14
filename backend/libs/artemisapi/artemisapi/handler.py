from typing import Callable

from artemisapi.maintenance import maintenance_check


def handler(
    event: dict, context: dict, api_handler: Callable[[dict, dict], dict], check_maintenance: bool = True
) -> dict:
    """Common API handler

    This method performs common API checks and then calls the API-specific handler specified
    """
    if check_maintenance:
        maintenance = maintenance_check(event)
        if maintenance is not None:
            # In maintenance mode so return the maintenance response and not the API response
            return maintenance

    # Not in maintenance mode so call the API's handler method
    return api_handler(event, context)
