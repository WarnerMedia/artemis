.PHONY: install install-dev test format clean update-requirements

install:
	@python -m pipenv sync

install-dev:
	@python -m pipenv sync --dev
	@pip install --editable .

test:
	@python -m pipenv run pytest

format:
	@python -m pipenv run black src/ --line-length=120 
	@python -m pipenv run isort src/ --profile black 

clean:
	@rm -rf `python -m pipenv --venv`

update-requirements: clean install
	@python -m pipenv run pip freeze > generated_requirements.txt
