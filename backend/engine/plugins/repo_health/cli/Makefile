.PHONY: install install-dev build test format update-requirements

install:
	@python -m pipenv install

install-dev:
	@python -m pipenv install --dev
	@pip install --editable .

build:
	@python -m pipenv run python -m build

test:
	@python -m pipenv run pytest

format:
	@python -m pipenv run black src/ --line-length=120 
	@python -m pipenv run isort src/ --profile black 

update-requirements: install
	@python -m pipenv uninstall --all-dev
	@python -m pipenv run pip freeze > generated_requirements.txt
