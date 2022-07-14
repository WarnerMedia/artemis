from engine.plugins.lib import utils

DEFAULT_PHP_SECRET_KEY = "php-compose-auth"


def parse_args():
    args = utils.parse_args(
        extra_args=[
            [["bin_path"], {"type": str, "nargs": "?", "default": "/app"}],
            [["secret_name"], {"type": str, "nargs": "?", "default": DEFAULT_PHP_SECRET_KEY}],
        ]
    )

    # Normalize the path
    if not args.bin_path.endswith("/"):
        args.bin_path += "/"
    return args
