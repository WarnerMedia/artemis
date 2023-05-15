SHELL := /bin/bash

RED=$(shell echo -e "\033[31m")
GREEN=$(shell echo -e "\033[32m")
YELLOW=$(shell echo -e "\033[33m")
BLUE=$(shell echo -e "\033[34m")
TEAL=$(shell echo -e "\033[36m")
CNone=$(shell echo -e "\033[0m")

TIME="[${TEAL} $(shell date +%Y-%m-%d' '%H:%M:%S)${CNone} ] "
INFO="  ${TIME}[${BLUE} .. ${CNone}] "
OK="  ${TIME}[${GREEN} OK ${CNone}] "
FAIL="  ${TIME}[${RED}FAIL${CNone}] "
WARN="  ${TIME}[${YELLOW} \!\! ${CNone}] "

.DEFAULT_GOAL := help

PYTHON := python3
PIP := pip3

VERSION := 1.0.0

# Must match one of the directories in terraform/environments/
ENV := nonprod

# Load the environment-specific config
include $(ENV).mk

# Application name extracted from Terraform
PREFIX := $(shell egrep "application\s+=\s+\".+\"" terraform/environments/${ENV}/main.tf | sed 's:[ "]::g' | cut -d'=' -f2)

S3_BUCKET := ${PREFIX}-${ACCOUNT_ID}
ECR_URL := ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/

ORG_QUEUE_LAMBDA := ${PREFIX}-org-queue
REPO_QUEUE_LAMBDA := ${PREFIX}-repo-queue
REPO_SCAN_LAMBDA := ${PREFIX}-repo-scan
REPO_SCAN_LOOP_LAMBDA := ${PREFIX}-repo-scan-loop
HEIMDALL_ORGS := ${PREFIX}-orgs
HEIMDALL_UTILS := ${PREFIX}-utils
HEIMDALL_REPOS := ${PREFIX}-repos

HEIMDALL_ORGS_DIR := lambdas/layers/heimdall_orgs
HEIMDALL_UTILS_DIR := lambdas/layers/heimdall_utils 
HEIMDALL_REPOS_DIR := lambdas/layers/heimdall_repos

HEIMDALL_ORGS_SRC = $(shell find ${HEIMDALL_ORGS_DIR} -type f -name '*.py' -o -name '*.cfg')
HEIMDALL_UTILS_SRC = $(shell find ${HEIMDALL_UTILS_DIR} -type f -name '*.py' -o -name '*.cfg')
HEIMDALL_REPOS_SRC = $(shell find ${HEIMDALL_REPOS_DIR} -type f -name '*.py' -o -name '*.cfg')

ROOT_DIR := $(shell pwd)
BUILD_DIR := ${ROOT_DIR}/build
LAMBDA_LAYERS_BUILD_DIR := $(BUILD_DIR)/lambdas/layers
DIST_DIR := ${ROOT_DIR}/dist

TEST_DIRS := ${ROOT_DIR}/lambdas/org_queue
TEST_DIRS := ${TEST_DIRS}:${ROOT_DIR}/lambdas/repo_queue
TEST_DIRS := ${TEST_DIRS}:${ROOT_DIR}/lambdas/repo_scan
TEST_DIRS := ${TEST_DIRS}:${ROOT_DIR}/lambdas/layers/heimdall_orgs
TEST_DIRS := ${TEST_DIRS}:${ROOT_DIR}/lambdas/layers/heimdall_repos
TEST_DIRS := ${TEST_DIRS}:${ROOT_DIR}/lambdas/layers/heimdall_utils

LAMBDA_PLATFORM := $(shell tr -d '[:blank:]"' <terraform/environments/${ENV}/main.tf | grep -xE 'lambda_architecture=(x86_64|arm64)' | cut -d '=' -f 2 | sed 's/arm64/aarch64/g')
LAMBDA_PYTHON_VER := 3.9
LAMBDA_PLATFORM_FLAGS := --platform manylinux2010_$(LAMBDA_PLATFORM) --platform manylinux2014_$(LAMBDA_PLATFORM) --platform manylinux_2_24_${LAMBDA_PLATFORM}

help:
	@echo
	@echo "${YELLOW}Usage:${CNone}"
	@echo " make <target>"
	@echo
	@echo "${YELLOW}Targets:${CNone}"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
.PHONY: help

venv:
	@echo "${INFO}Building venv"
	${PIP} install --upgrade --user pipenv; \
	${PYTHON} -m pipenv install
	@echo "${OK}"
.PHONY: venv

unit-test: venv ## Run unit tests
	export PYTHONPATH=${PYTHONPATH}:${TEST_DIRS}; \
	${PYTHON} -m pipenv check; \
	${PYTHON} -m pipenv install --dev; \
	${PYTHON} -m pipenv run pytest -c "pytest.ini" -m "not integtest" ${PYTEST_EXTRA_ARGS};

integration-test: venv ## Run integration tests
	export ARTEMIS_S3_BUCKET=${ARTEMIS_S3_BUCKET};\
	export SCAN_TABLE=$(shell cd terraform/${ENV} && terraform output repo-scan-table-name); \
	export PYTHONPATH=${PYTHONPATH}:${TEST_DIRS}; \
	${PYTHON} -m pipenv check; \
	${PYTHON} -m pipenv install --dev; \
	${PYTHON} -m pipenv run pytest -c "pytest.ini" -m "integtest" --no-pylint ${PYTEST_EXTRA_ARGS};

test: unit-test \
	  integration-test
.PHONY: test

###############################################################################
# Lambdas
###############################################################################

# Secondary expansion is needed to use the target stem in the prerequisites.
# It is not enabled by default in make for backwards-compatibility reasons.
# Only needs to be specified once.
.SECONDEXPANSION:
dist/lambdas/%.zip: $$(shell find lambdas/$$* -type f)
	@echo "${INFO}Building $*"
	mkdir -p ${BUILD_DIR}/lambdas/$*
	${PIP} install lambdas/$* -t ${BUILD_DIR}/lambdas/$* --upgrade
	cp lambdas/$*/handlers.py ${BUILD_DIR}/lambdas/$*
	mkdir -p ${DIST_DIR}/lambdas/$*
	cd ${BUILD_DIR}/lambdas/$*; zip -r ${DIST_DIR}/lambdas/$*.zip *
	@echo "${OK}"

dist/org_queue.zip: batch/org_queue/*
	mkdir -p ${BUILD_DIR}/org_queue
	cp -r batch/org_queue/* ${BUILD_DIR}/org_queue
	${PIP} install -r ${BUILD_DIR}/org_queue/requirements.txt -t ${BUILD_DIR}/org_queue --upgrade
	mkdir -p ${DIST_DIR}
	cd ${BUILD_DIR}/org_queue; zip -r ${DIST_DIR}/org_queue.zip *

dist/repo_queue.zip: batch/repo_queue/*
	mkdir -p ${BUILD_DIR}/repo_queue
	cp -r batch/repo_queue/* ${BUILD_DIR}/repo_queue
	${PIP} install -r ${BUILD_DIR}/repo_queue/requirements.txt -t ${BUILD_DIR}/repo_queue --upgrade
	mkdir -p ${DIST_DIR}
	cd ${BUILD_DIR}/repo_queue; zip -r ${DIST_DIR}/repo_queue.zip *

dist/repo_scan.zip: batch/repo_scan/*
	mkdir -p ${BUILD_DIR}/repo_scan
	cp -r batch/repo_scan/* ${BUILD_DIR}/repo_scan
	${PIP} install -r ${BUILD_DIR}/repo_scan/requirements.txt -t ${BUILD_DIR}/repo_scan --upgrade
	mkdir -p ${DIST_DIR}
	cd ${BUILD_DIR}/repo_scan; zip -r ${DIST_DIR}/repo_scan.zip *

dist/repo_scan_loop.zip: batch/repo_scan_loop/*
	mkdir -p ${BUILD_DIR}/repo_scan_loop
	cp -r batch/repo_scan_loop/* ${BUILD_DIR}/repo_scan_loop
	${PIP} install -r ${BUILD_DIR}/repo_scan_loop/requirements.txt -t ${BUILD_DIR}/repo_scan_loop --upgrade
	mkdir -p ${DIST_DIR}
	cd ${BUILD_DIR}/repo_scan_loop; zip -r ${DIST_DIR}/repo_scan_loop.zip *

###############################################################################
# Lambda Layers
###############################################################################

dist/lambdas/layers/heimdall_orgs.zip: ${HEIMDALL_ORGS_SRC}
	@echo "${INFO}Building $*"
	mkdir -p ${LAMBDA_LAYERS_BUILD_DIR}/heimdall_orgs/python
	${PIP} install --upgrade --target ${LAMBDA_LAYERS_BUILD_DIR}/heimdall_orgs/python --python-version ${LAMBDA_PYTHON_VER} --no-deps ${HEIMDALL_ORGS_DIR}
	${PIP} install --upgrade --target ${LAMBDA_LAYERS_BUILD_DIR}/heimdall_orgs/python --python-version ${LAMBDA_PYTHON_VER} --only-binary=:all: requests
	mkdir -p ${DIST_DIR}/lambdas/layers/heimdall_orgs/python
	cd ${LAMBDA_LAYERS_BUILD_DIR}/heimdall_orgs; zip -r ${DIST_DIR}/lambdas/layers/heimdall_orgs.zip *
	@echo "${OK}"

dist/lambdas/layers/heimdall_utils.zip: ${HEIMDALL_UTILS_SRC}
	@echo "${INFO}Building $*"
	mkdir -p ${LAMBDA_LAYERS_BUILD_DIR}/heimdall_utils/python
	${PIP} install --upgrade --target ${LAMBDA_LAYERS_BUILD_DIR}/heimdall_utils/python --python-version ${LAMBDA_PYTHON_VER} --no-deps ${HEIMDALL_UTILS_DIR}
	${PIP} install --upgrade --target ${LAMBDA_LAYERS_BUILD_DIR}/heimdall_utils/python --python-version ${LAMBDA_PYTHON_VER} --only-binary=:all: pyjwt requests
	${PIP} install --upgrade --target ${LAMBDA_LAYERS_BUILD_DIR}/heimdall_utils/python --python-version ${LAMBDA_PYTHON_VER} --only-binary=:all: ${LAMBDA_PLATFORM_FLAGS} cryptography
	mkdir -p ${DIST_DIR}/lambdas/layers/heimdall_utils/python
	cd ${LAMBDA_LAYERS_BUILD_DIR}/heimdall_utils; zip -r ${DIST_DIR}/lambdas/layers/heimdall_utils.zip *
	@echo "${OK}"

dist/lambdas/layers/heimdall_repos.zip: ${HEIMDALL_REPOS_SRC}
	@echo "${INFO}Building $*"
	mkdir -p ${LAMBDA_LAYERS_BUILD_DIR}/heimdall_repos/python
	${PIP} install --upgrade --target ${LAMBDA_LAYERS_BUILD_DIR}/heimdall_repos/python --python-version ${LAMBDA_PYTHON_VER} --no-deps ${HEIMDALL_REPOS_DIR}
	${PIP} install --upgrade --target ${LAMBDA_LAYERS_BUILD_DIR}/heimdall_repos/python --python-version ${LAMBDA_PYTHON_VER} --only-binary=:all: requests
	mkdir -p ${DIST_DIR}/lambdas/layers/heimdall_repos/python
	cd ${LAMBDA_LAYERS_BUILD_DIR}/heimdall_repos; zip -r ${DIST_DIR}/lambdas/layers/heimdall_repos.zip *
	@echo "${OK}"

lambdas: dist/lambdas/org_queue.zip \
			dist/lambdas/repo_queue.zip \
			dist/lambdas/repo_scan.zip \
			dist/lambdas/repo_scan_loop.zip \
			dist/lambdas/layers/heimdall_orgs.zip \
			dist/lambdas/layers/heimdall_utils.zip \
			dist/lambdas/layers/heimdall_repos.zip
.PHONY: lambdas

build: lambdas ## Builds all lambdas
.PHONY: build

upload_org_queue: dist/lambdas/org_queue.zip
	aws s3 cp dist/lambdas/org_queue.zip s3://${S3_BUCKET}/lambdas/org_queue/v${VERSION}/org_queue.zip
.PHONY: upload_org_queue

upload_repo_queue: dist/lambdas/repo_queue.zip
	aws s3 cp dist/lambdas/repo_queue.zip s3://${S3_BUCKET}/lambdas/repo_queue/v${VERSION}/repo_queue.zip
.PHONY: upload_repo_queue

upload_repo_scan: dist/lambdas/repo_scan.zip
	aws s3 cp dist/lambdas/repo_scan.zip s3://${S3_BUCKET}/lambdas/repo_scan/v${VERSION}/repo_scan.zip
.PHONY: upload_repo_scan

upload_repo_scan_loop: dist/lambdas/repo_scan_loop.zip
	aws s3 cp dist/lambdas/repo_scan_loop.zip s3://${S3_BUCKET}/lambdas/repo_scan_loop/v${VERSION}/repo_scan_loop.zip
.PHONY: upload_repo_scan_loop

upload_heimdall_orgs: dist/lambdas/layers/heimdall_orgs.zip
	aws s3 cp dist/lambdas/layers/heimdall_orgs.zip s3://${S3_BUCKET}/lambdas/layers/orgs/v${VERSION}/orgs.zip
.PHONY: upload_heimdall_orgs

upload_heimdall_utils: dist/lambdas/layers/heimdall_utils.zip
	aws s3 cp dist/lambdas/layers/heimdall_utils.zip s3://${S3_BUCKET}/lambdas/layers/utils/v${VERSION}/utils.zip
.PHONY: upload_heimdall_utils

upload_heimdall_repos: dist/lambdas/layers/heimdall_repos.zip
	aws s3 cp dist/lambdas/layers/heimdall_repos.zip s3://${S3_BUCKET}/lambdas/layers/repos/v${VERSION}/repos.zip
.PHONY: upload_heimdall_repos

deploy_org_queue: upload_org_queue
	@echo "${INFO}Deploying ${ORG_QUEUE_LAMBDA} function code"
	aws lambda update-function-code \
		--function-name ${ORG_QUEUE_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/org_queue/v${VERSION}/org_queue.zip
	@echo "${INFO}Waiting for ${ORG_QUEUE_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${ORG_QUEUE_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${ORG_QUEUE_LAMBDA} layer configuration"
	aws lambda update-function-configuration \
		--function-name ${ORG_QUEUE_LAMBDA} \
		--region ${REGION} \
		--layer \
		  arn:aws:lambda:${REGION}:${ACCOUNT_ID}:layer:${HEIMDALL_ORGS}:$(shell aws lambda list-layer-versions --layer-name ${HEIMDALL_ORGS} --region=us-east-1 | jq -r '.LayerVersions[0].Version') \
		  arn:aws:lambda:${REGION}:${ACCOUNT_ID}:layer:${HEIMDALL_UTILS}:$(shell aws lambda list-layer-versions --layer-name ${HEIMDALL_UTILS} --region=us-east-1 | jq -r '.LayerVersions[0].Version')
	@echo "${OK}"
.PHONY: deploy_org_queue

deploy_repo_queue: upload_repo_queue
	@echo "${INFO}Deploying ${REPO_QUEUE_LAMBDA} function code"
	aws lambda update-function-code \
		--function-name ${REPO_QUEUE_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/repo_queue/v${VERSION}/repo_queue.zip
	@echo "${INFO}Waiting for ${REPO_QUEUE_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${REPO_QUEUE_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${REPO_QUEUE_LAMBDA} layer configuration"
	aws lambda update-function-configuration \
		--function-name ${REPO_QUEUE_LAMBDA} \
		--region ${REGION} \
		--layer \
		  arn:aws:lambda:${REGION}:${ACCOUNT_ID}:layer:${HEIMDALL_REPOS}:$(shell aws lambda list-layer-versions --layer-name ${HEIMDALL_REPOS} --region=us-east-1 | jq -r '.LayerVersions[0].Version') \
		  arn:aws:lambda:${REGION}:${ACCOUNT_ID}:layer:${HEIMDALL_UTILS}:$(shell aws lambda list-layer-versions --layer-name ${HEIMDALL_UTILS} --region=us-east-1 | jq -r '.LayerVersions[0].Version')
	@echo "${OK}"
.PHONY: deploy_repo_queue

deploy_repo_scan: upload_repo_scan
	@echo "${INFO}Deploying ${REPO_SCAN_LAMBDA} function code"
	aws lambda update-function-code \
		--function-name ${REPO_SCAN_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/repo_scan/v${VERSION}/repo_scan.zip
	@echo "${INFO}Waiting for ${REPO_SCAN_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${REPO_SCAN_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${REPO_SCAN_LAMBDA} layer configuration"
	aws lambda update-function-configuration \
		--function-name ${REPO_SCAN_LAMBDA} \
		--region ${REGION} \
		--layer \
		  arn:aws:lambda:${REGION}:${ACCOUNT_ID}:layer:${HEIMDALL_UTILS}:$(shell aws lambda list-layer-versions --layer-name ${HEIMDALL_UTILS} --region=us-east-1 | jq -r '.LayerVersions[0].Version')
	@echo "${OK}"
.PHONY: deploy_repo_scan

deploy_repo_scan_loop: upload_repo_scan_loop
	@echo "${INFO}Deploying ${REPO_SCAN_LOOP_LAMBDA} function code"
	aws lambda update-function-code \
		--function-name ${REPO_SCAN_LOOP_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/repo_scan_loop/v${VERSION}/repo_scan_loop.zip
	@echo "${INFO}Waiting for ${REPO_SCAN_LOOP_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${REPO_SCAN_LOOP_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${REPO_SCAN_LOOP_LAMBDA} layer configuration"
	aws lambda update-function-configuration \
		--function-name ${REPO_SCAN_LOOP_LAMBDA} \
		--region ${REGION} \
		--layer \
		  arn:aws:lambda:${REGION}:${ACCOUNT_ID}:layer:${HEIMDALL_UTILS}:$(shell aws lambda list-layer-versions --layer-name ${HEIMDALL_UTILS} --region=us-east-1 | jq -r '.LayerVersions[0].Version')
	@echo "${OK}"
.PHONY: deploy_repo_scan_loop

deploy_heimdall_orgs: upload_heimdall_orgs
	@echo "${INFO}Deploying ${HEIMDALL_ORGS} lambda layer"
	aws lambda publish-layer-version \
		--layer-name ${HEIMDALL_ORGS} \
		--region ${REGION} \
		--content S3Bucket=${S3_BUCKET},S3Key=lambdas/layers/orgs/v${VERSION}/orgs.zip
	@echo "${OK}"
.PHONY: deploy_heimdall_orgs

deploy_heimdall_utils: upload_heimdall_utils
	@echo "${INFO}Deploying ${HEIMDALL_UTILS} lambda layer"
	aws lambda publish-layer-version \
		--layer-name ${HEIMDALL_UTILS} \
		--region ${REGION} \
		--content S3Bucket=${S3_BUCKET},S3Key=lambdas/layers/utils/v${VERSION}/utils.zip
	@echo "${OK}"
.PHONY: deploy_heimdall_utils

deploy_heimdall_repos: upload_heimdall_repos
	@echo "${INFO}Deploying ${HEIMDALL_REPOS} lambda layer"
	aws lambda publish-layer-version \
		--layer-name ${HEIMDALL_REPOS} \
		--region ${REGION} \
		--content S3Bucket=${S3_BUCKET},S3Key=lambdas/layers/repos/v${VERSION}/repos.zip
	@echo "${OK}"
.PHONY: deploy_heimdall_repos

upload_lambdas: upload_heimdall_orgs \
				upload_heimdall_utils \
				upload_heimdall_repos \
				upload_org_queue \
				upload_repo_queue \
				upload_repo_scan \
				upload_repo_scan_loop
.PHONY: upload_lambdas

deploy_lambdas: deploy_heimdall_orgs \
				deploy_heimdall_utils \
				deploy_heimdall_repos \
				deploy_org_queue \
				deploy_repo_queue \
				deploy_repo_scan \
				deploy_repo_scan_loop
.PHONY: deploy_lambdas

upload: upload_lambdas ## Uploads all lambdas to S3

deploy: deploy_lambdas ## Deploys all lambdas
.PHONY: deploy

clean: ## Cleans up the build, dist, venv directories
	rm -rf ${BUILD_DIR}
	rm -rf ${DIST_DIR}
	rm -rf venv
	rm -rf .pytest_cache
	find . -name "__pycache__" -type d | xargs rm -r
	find . -name ".eggs" -type d | xargs rm -r
	find . -name "*.egg-info" -type d | xargs rm -r
	find . -name "build" -type d | xargs rm -r
.PHONY: clean
