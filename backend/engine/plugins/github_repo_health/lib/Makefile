.PHONY: install install-dev test format

UV := uv

install:
	@${UV} sync --locked --no-dev --no-editable

install-dev:
	@${UV} sync --locked

test:
	@${UV} run pytest

format:
	@${UV} run ruff check src/
	@${UV} run isort src/ --profile black
