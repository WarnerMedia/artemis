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

###############################################################################
# Variables
###############################################################################

# Pathing
ROOT_DIR := $(shell pwd)
WORKING_DIR := ${ROOT_DIR}
BUILD_DIR := ${ROOT_DIR}/build
LAMBDA_LAYERS_BUILD_DIR := $(BUILD_DIR)/lambdas/layers
DIST_DIR := ${ROOT_DIR}/dist
STAGE_DIR := ${ROOT_DIR}/stage
TERRAFORM_DIR := ${WORKING_DIR}/terraform
BACKEND := ${ROOT_DIR}/../backend

PYTHON := python3
PIP := pip3
TERRAFORM := terraform

VERSION := 1.0.0

# Must match one of the directories in terraform/environments/
ENV := nonprod

# Load the environment-specific config
include ${WORKING_DIR}/$(ENV).mk

# Application name extracted from Terraform
PREFIX := $(shell egrep "application\s+=\s+\".+\"" ${TERRAFORM_DIR}/environments/${ENV}/main.tf | sed 's:[ "]::g' | cut -d'=' -f2)

S3_BUCKET := ${PREFIX}-${ACCOUNT_ID}
ECR_URL := ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/

ORG_QUEUE_LAMBDA := ${PREFIX}-org-queue
REPO_QUEUE_LAMBDA := ${PREFIX}-repo-queue
REPO_SCAN_LAMBDA := ${PREFIX}-repo-scan
REPO_SCAN_LOOP_LAMBDA := ${PREFIX}-repo-scan-loop
HEIMDALL_CORE := ${PREFIX}-core

HEIMDALL_ORGS_DIR := lambdas/layers/heimdall_orgs
HEIMDALL_UTILS_DIR := lambdas/layers/heimdall_utils
HEIMDALL_REPOS_DIR := lambdas/layers/heimdall_repos

HEIMDALL_ORGS_SRC = $(shell find ${HEIMDALL_ORGS_DIR} -type f -name '*.py' -o -name '*.cfg')
HEIMDALL_UTILS_SRC = $(shell find ${HEIMDALL_UTILS_DIR} -type f -name '*.py' -o -name '*.cfg')
HEIMDALL_REPOS_SRC = $(shell find ${HEIMDALL_REPOS_DIR} -type f -name '*.py' -o -name '*.cfg')

LAMBDA_PLATFORM := $(shell tr -d '[:blank:]"' <${TERRAFORM_DIR}/environments/${ENV}/main.tf | grep -xE 'lambda_architecture=(x86_64|arm64)' | cut -d '=' -f 2 | sed 's/arm64/aarch64/g')
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

define run-pytest
	@echo "${INFO}Running $1"
	export PIPENV_DONT_LOAD_ENV=1 DATADOG_ENABLED=True;\
	$2 \
	${PYTHON} -m pipenv sync --dev; \
	${PYTHON} -m pipenv run pytest -c pytest.ini $3 ${PYTEST_EXTRA_ARGS};
	@echo "${OK}"
endef

unit-test:
	$(call run-pytest,unit tests,,-m "not integtest and not end2end")
.PHONY: unit-test

integration-test:
	$(call run-pytest,integration tests,\
		export ARTEMIS_S3_BUCKET=${ARTEMIS_S3_BUCKET}; \
		export ARTEMIS_API=${ARTEMIS_API};,\
		-m "integtest")
.PHONY: integration-test

end2end-test:
	$(call run-pytest,end to end tests,,-m "end2end")
.PHONY: end2end-test

test: style-test
	$(call run-pytest,all tests,\
		export ARTEMIS_S3_BUCKET=${ARTEMIS_S3_BUCKET}; \
		export ARTEMIS_API=${ARTEMIS_API};,\
	)
.PHONY: test

style-test:
	@echo "${INFO}Running code style checks"
	${PYTHON} -m pipenv sync --dev
	${PYTHON} -m pipenv run ruff format --check .
#	Note: Not using TERRAFORM_DIR since we're only checking the local sources,
#	not overrrides.
	${TERRAFORM} fmt -check -recursive terraform
	@echo "${OK}"
.PHONY: style-test

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

###############################################################################
# Lambda Layers
###############################################################################
dist/lambdas/layers/heimdall_core.zip: ${HEIMDALL_ORGS_SRC} ${HEIMDALL_UTILS_SRC} ${HEIMDALL_REPOS_SRC}
	@echo "{INFO} Building ${HEIMDALL_CORE}"
	mkdir -p ${LAMBDA_LAYERS_BUILD_DIR}/heimdall_core/python
	${PIP} install --upgrade --target ${LAMBDA_LAYERS_BUILD_DIR}/heimdall_core/python --python-version ${LAMBDA_PYTHON_VER} --no-deps ${HEIMDALL_ORGS_DIR}
	${PIP} install --upgrade --target ${LAMBDA_LAYERS_BUILD_DIR}/heimdall_core/python --python-version ${LAMBDA_PYTHON_VER} --no-deps ${HEIMDALL_UTILS_DIR}
	${PIP} install --upgrade --target ${LAMBDA_LAYERS_BUILD_DIR}/heimdall_core/python --python-version ${LAMBDA_PYTHON_VER} --no-deps ${HEIMDALL_REPOS_DIR}

	@echo "{INFO} Adding dependencies to Lambda Layer"
	${PYTHON} -m pipenv requirements > ${LAMBDA_LAYERS_BUILD_DIR}/requirements.txt
	${PIP} install -r ${LAMBDA_LAYERS_BUILD_DIR}/requirements.txt --upgrade --target ${LAMBDA_LAYERS_BUILD_DIR}/heimdall_core/python --python-version ${LAMBDA_PYTHON_VER} --only-binary=:all: ${LAMBDA_PLATFORM_FLAGS} 

	mkdir -p ${DIST_DIR}/lambdas/layers/heimdall_core/python
	cd ${LAMBDA_LAYERS_BUILD_DIR}/heimdall_core; zip -r ${DIST_DIR}/lambdas/layers/heimdall_core.zip *
	@echo "${OK}"

lambdas: dist/lambdas/org_queue.zip \
			dist/lambdas/repo_queue.zip \
			dist/lambdas/repo_scan.zip \
			dist/lambdas/repo_scan_loop.zip \
			dist/lambdas/layers/heimdall_core.zip
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

upload_heimdall_core: dist/lambdas/layers/heimdall_core.zip
	aws s3 cp dist/lambdas/layers/heimdall_core.zip s3://${S3_BUCKET}/lambdas/layers/heimdall_core/v${VERSION}/heimdall_core.zip
.PHONY: upload_heimdall_core

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
	@${BACKEND}/build_scripts/update_lambda_layers.py --function-name ${ORG_QUEUE_LAMBDA} --region ${REGION}
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
	@${BACKEND}/build_scripts/update_lambda_layers.py --function-name ${REPO_QUEUE_LAMBDA} --region ${REGION}
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
	@${BACKEND}/build_scripts/update_lambda_layers.py --function-name ${REPO_SCAN_LAMBDA} --region ${REGION}
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
	@${BACKEND}/build_scripts/update_lambda_layers.py --function-name ${REPO_SCAN_LOOP_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_repo_scan_loop

deploy_heimdall_core: upload_heimdall_core
	@echo "${INFO}Deploying ${HEIMDALL_CORE} lambda layer"
	aws lambda publish-layer-version \
		--layer-name ${HEIMDALL_CORE} \
		--region ${REGION} \
		--content S3Bucket=${S3_BUCKET},S3Key=lambdas/layers/heimdall_core/v${VERSION}/heimdall_core.zip \
		--compatible-runtimes python${LAMBDA_PYTHON_VER}
	@echo "${OK}"
.PHONY: deploy_heimdall_core

upload_lambdas: upload_heimdall_core \
				upload_org_queue \
				upload_repo_queue \
				upload_repo_scan \
				upload_repo_scan_loop
.PHONY: upload_lambdas

deploy_lambdas: deploy_heimdall_core \
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
	rm -rf .ruff_cache
	find . -name "__pycache__" -type d | xargs rm -r
	find . -name ".eggs" -type d | xargs rm -r
	find . -name "*.egg-info" -type d | xargs rm -r
	find . -name "build" -type d | xargs rm -r
.PHONY: clean
