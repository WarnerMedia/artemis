import json
import os
from argparse import Namespace
from pathlib import Path
from unittest.mock import patch

from engine.plugins.php_sensio_security_checker.main import BuildOrder, PhpDependencyNode, main

PHP_MAIN = "engine.plugins.php_sensio_security_checker.main."
PHP_PREP = "engine.plugins.php_sensio_security_checker.prep."
TEST_DIR = os.path.dirname(os.path.abspath(__file__))


def test_file_is_cleaned_up():
    php_auth = json.dumps({"url": "example.com", "username": "foo", "password": "bar"})
    secrets = {
        "status": "success",
        "response": php_auth,
    }
    args = Namespace()
    args.bin_path = "/app/"
    args.secret_name = "php-compose-auth"
    auth_file = Path("auth.json")
    args.path = TEST_DIR
    checker_results = {
        "result": True,
        "stdout": "",
        "stderr": "",
    }
    build_order = BuildOrder()
    build_order.add_node(
        PhpDependencyNode(package_name="artemis/phpcomponent", composer_file_name="/app/composer.json")
    )
    build_result = {"build_order": build_order, "errors": []}

    with patch(f"{PHP_PREP}utils.get_secret_with_status", return_value=secrets):
        with patch(f"{PHP_MAIN}parse_args", side_effect=[args]):
            with patch(f"{PHP_PREP}parse_args", side_effect=[args]):
                with patch(f"{PHP_MAIN}clean_up_auth_files"):
                    with patch(f"{PHP_MAIN}generate_build_order") as mock_generator:
                        mock_generator.return_value = build_result
                        with patch(f"{PHP_MAIN}run_security_checker") as mock_checker:
                            mock_checker.return_value = checker_results
                            with patch(f"{PHP_PREP}composer_install") as mock_install:
                                mock_install.side_effect = [{"success": True, "details": ""}]
                                with patch(f"{PHP_MAIN}remove_created_files") as delete_files:
                                    delete_files.return_value = None
                                    main()

    mock_checker.assert_called()
    assert not auth_file.exists()
