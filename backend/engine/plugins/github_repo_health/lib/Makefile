.PHONY: install install-dev test format update-requirements

install:
	@python -m pipenv sync

install-dev:
	@python -m pipenv sync --dev
	@pip install --editable .

test:
	@python -m pipenv run pytest

format:
	@python -m pipenv run ruff src/ --line-length=120
	@python -m pipenv run isort src/ --profile black
