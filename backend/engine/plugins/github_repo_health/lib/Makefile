.PHONY: install install-dev build test format update-requirements

install:
	@python -m pipenv sync

install-dev:
	@python -m pipenv sync --dev
	@pip install --editable .

build:
	@python -m pipenv run python -m build

test:
	@python -m pipenv run pytest

format:
	@python -m pipenv run black src/ --line-length=120 
	@python -m pipenv run isort src/ --profile black 

