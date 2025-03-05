SHELL := /bin/bash

###############################################################################
# Output formatting helpers
###############################################################################

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
DIST_DIR := ${ROOT_DIR}/dist
STAGE_DIR := ${ROOT_DIR}/stage
TERRAFORM_DIR := ${WORKING_DIR}/terraform

DOCKER := docker
PYTHON := python3
PIP := pip3
TERRAFORM := terraform

VERSION := 2.0.0

# Grab the short hash of the latest commit
LATEST_COMMIT = $(shell git rev-parse --short HEAD)

# Must match one of the directories in terraform/environments/
ENV := nonprod

# Load the environment-specific config
include ${WORKING_DIR}/$(ENV).mk

# Application name extracted from Terraform
PREFIX := $(shell egrep "application\s+=\s+\".+\"" ${TERRAFORM_DIR}/environments/${ENV}/main.tf | sed 's:[ "]::g' | cut -d'=' -f2)

S3_BUCKET := ${PREFIX}-${ACCOUNT_ID}
S3_DOCS_BUCKET := ${PREFIX}-docs-${ACCOUNT_ID}
S3_UI_BUCKET := ${PREFIX}-ui-${ACCOUNT_ID}
ECR_URL := ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/

ifndef ANALYZER_DJANGO_SECRET_KEY
	export ANALYZER_DJANGO_SECRET_KEY=testdjango
	export ANALYZER_DB_NAME=artemisdb
	export ANALYZER_DB_USERNAME=analyzerlocaldev
	export ANALYZER_DB_PASSWORD=dbpass
	export ANALYZER_DB_HOST=127.0.0.1
	export ANALYZER_DB_PORT=5433
endif

# Lambdas
REPO_LAMBDA := ${PREFIX}-repo-handler
USERS_LAMBDA := ${PREFIX}-users-handler
USERS_KEYS_LAMBDA := ${PREFIX}-users-keys-handler
USERS_SERVICES_LAMBDA := ${PREFIX}-users-services-handler
GROUPS_LAMBDA := ${PREFIX}-groups-handler
GROUPS_MEMBERS_LAMBDA := ${PREFIX}-groups-members-handler
GROUPS_KEYS_LAMBDA := ${PREFIX}-groups-keys-handler
TASK_QUEUE_METRICS_LAMBDA := ${PREFIX}-task-queue-metrics
SCALE_DOWN_LAMBDA_NAT := ${PREFIX}-scale-down-nat
SCALE_DOWN_LAMBDA_PUBLIC := ${PREFIX}-scale-down-public
CALLBACK_LAMBDA := ${PREFIX}-callback
EVENT_DISPATCH_LAMBDA := ${PREFIX}-event-dispatch
SPLUNK_HANDLER_LAMBDA := ${PREFIX}-splunk-handler
API_AUTHORIZER_LAMBDA := ${PREFIX}-api-authorizer
SIGNIN_LAMBDA := ${PREFIX}-signin-handler
JSON_REPORT_LAMBDA := ${PREFIX}-json-report
PDF_REPORT_LAMBDA := ${PREFIX}-pdf-report
REPORT_CLEANUP_LAMBDA := ${PREFIX}-report-cleanup
UPDATE_GITHUB_ORG_USERS_LAMBDA := ${PREFIX}-update-github-org-users
SBOM_COMPONENTS_LAMBDA := ${PREFIX}-sbom-components-handler
SBOM_LICENSES_LAMBDA := ${PREFIX}-sbom-licenses-handler
SBOM_REPORT_LAMBDA := ${PREFIX}-sbom-report
AUDIT_EVENT_LAMBDA := ${PREFIX}-audit-event-handler
SCAN_SCHEDULER_LAMBDA := ${PREFIX}-scan-scheduler
SCHEDULED_SCAN_HANDLER_LAMBDA := ${PREFIX}-scheduled-scan-handler
SEARCH_REPOSITORIES_LAMBDA := ${PREFIX}-search-repositories-handler
SYSTEM_STATUS_LAMBDA := ${PREFIX}-system-status-handler
CI_TOOLS_LAMBDA := ${PREFIX}-ci-tools-handler
SCANS_BATCH_LAMBDA := ${PREFIX}-scans-batch-handler
DB_CLEANUP_LAMBDA := ${PREFIX}-db-cleanup
SYSTEM_ALLOWLIST_LAMBDA := ${PREFIX}-system-allowlist-handler
SEARCH_SCANS_LAMBDA := ${PREFIX}-search-scans-handler
SEARCH_VULNERABILITIES_LAMBDA := ${PREFIX}-search-vulnerabilities-handler
LICENSE_RETRIEVER_LAMBDA := ${PREFIX}-license-retriever
SYSTEM_SERVICES_LAMBDA := ${PREFIX}-system-services-handler
SERVICE_CONNECTION_METRICS_LAMBDA := ${PREFIX}-service-connection-metrics

BACKEND_CORE_LAMBDA_LAYER := ${PREFIX}-backend-core

ENGINE_PKG := ${PREFIX}/engine
ENGINE_TAG := ${ENGINE_PKG}:latest

PYTHON_PKG := ${PREFIX}/python
PYTHON_TAG := ${PYTHON_PKG}:3-latest

NODE_PKG := ${PREFIX}/node
NODE_TAG := ${NODE_PKG}:latest

PHP_PKG := ${PREFIX}/php
PHP_TAG := ${PHP_PKG}:latest

DIND_PKG := ${PREFIX}/dind
DIND_TAG := ${DIND_PKG}:latest

GOLANG_PKG := ${PREFIX}/golang
GOLANG_TAG := ${GOLANG_PKG}:latest

RUBY_PKG := ${PREFIX}/ruby
RUBY_TAG := ${RUBY_PKG}:latest

JAVA_PKG := ${PREFIX}/java
JAVA8_TAG := ${JAVA_PKG}:8-latest
JAVA11_TAG := ${JAVA_PKG}:11-latest
JAVA17_TAG := ${JAVA_PKG}:17-latest
JAVA21_TAG := ${JAVA_PKG}:21-latest

DB_MAINT_PKG := ${PREFIX}/db_maintenance
DB_MAINT_TAG := ${DB_MAINT_PKG}:latest

VERACODE_PKG := ${PREFIX}/veracode
VERACODE_TAG := ${VERACODE_PKG}:latest
# Context: egrep grabs the terraform line that notes whether veracode is enabled. sed removes all spacing. Cut grabs the bool.
VERACODE_FLAG := $(shell egrep "veracode_enabled\s+=\s+(true|false)" ${TERRAFORM_DIR}/environments/${ENV}/main.tf | sed 's: ::g' | cut -d'=' -f2)

SWIFT_PKG := ${PREFIX}/swift
SWIFT_TAG := ${SWIFT_PKG}:latest
SWIFTLINT_VER := 0.45.1
SWIFTLINT_SHA := 3b5075a5cdf17fc5aaf03636b81d96b29ff5040ee24ca11e1fafc3b43e0fb9e4

FSB_VER := 1.12.0
FSB_PATCH := 
OWASP_DC := 12.1.0
OWASP_DC_SHA := 0e5ba6ae58e753d5841048c6c8e495dbc4c7a4ea921a2b14daeac65195700532
GIT_SECRETS_VER := 1.3.0

ARTEMISAPI = libs/artemisapi
ARTEMISDB = libs/artemisdb
ARTEMISLIB = libs/artemislib

ENGINE_SRC = $(shell find engine -type f -name '*.py' -o -name '*.json' -o -name '*.js')
DB_LIB_SRC = $(shell find ${ARTEMISDB} -type f -name '*.py' -o -name '*.cfg')
SHARED_LIB_SRC = $(shell find ${ARTEMISLIB} -type f -name '*.py' -o -name '*.cfg')
API_LIB_SRC = $(shell find ${ARTEMISAPI} -type f -name '*.py' -o -name '*.cfg')

# Engine base image
ENGINE_BASE := 3.9-slim-bullseye

# Enry Info
ENRYVER := 1.1.0
ENRYSHA := 9bab0ea9498fd473263f4fc1efc3c710570422771d2c78c837fb3cdc10ec0d79

#GoSec Info
GOSECVER := 2.18.2
GOSECSHA := 9f1113983f1f206cbf91eeb82bc8e14ba73b56b127fab4119c3d8e5980ab4833

# Shell Check Info
SHELLCHECKVER := 0.10.0
SHELLCHECKSHA := 6c881ab0698e4e6ea235245f22832860544f17ba386442fe7e9d629f8cbedf87

OSFLAG := $(shell uname -s | tr A-Z a-z)

# TFLint Info
TFLINT_VER := 0.20.2
TFLINT_SHA := 9d0c2a6da320e55018c1ae3df9d5f4e4fe0f34274a609b29f306f407db9e6a2e

# CFN Python Lint
CFN_VER = 1.18.1

# Python Packaging Library Version
PACKAGING_VER = 23.2

# Artemis test parameters
BRANCH_NAME := $(shell git branch --no-color 2> /dev/null | sed -e '/^[^*]/d' -e 's/* \(.*\)/\1/')
SEVERITY_LEVELS := critical,high

# Security Scanner
PHP_SCANNER_VER := 1.0.0

# Trivy
TRIVY_COMMIT := 6ccc0a554b07b05fd049f882a1825a0e1e0aabe1
TRIVY_VER := v0.49.1

# Trufflehog Version
TRUFFLEHOG_COMMIT := 4484bf443b7858d89dd26541f46a3ae0794206a5
TRUFFLEHOG_VER := v3.82.5

# Snyk
SNYK_VER := v1.889.0
# Context: egrep grabs the terraform line that notes whether Snyk is enabled. sed removes all spacing. Cut grabs the bool.
SNYK_FLAG := $(shell egrep "snyk_enabled\s+=\s+(true|false)" ${TERRAFORM_DIR}/environments/${ENV}/main.tf | sed 's: ::g' | cut -d'=' -f2)

# Detekt
DETEKT_VER := 1.19.0
DETEKT_SHA := 4bc545c95c3711daeedd7766a9884ac50f2a49a0b472cef2b14dae332c58294d

# Lambdas
LAMBDA_PLATFORM := $(shell tr -d '[:blank:]"' <${TERRAFORM_DIR}/environments/${ENV}/main.tf | grep -xE 'lambda_architecture=(x86_64|arm64)' | cut -d '=' -f 2 | sed 's/arm64/aarch64/g')
LAMBDA_PYTHON_VER := 3.9
LAMBDA_PLATFORM_FLAGS := --platform manylinux2010_$(LAMBDA_PLATFORM) --platform manylinux2014_$(LAMBDA_PLATFORM) --platform manylinux_2_24_${LAMBDA_PLATFORM}
LAMBDA_LAYERS_BUILD_DIR := $(BUILD_DIR)/lambdas/layers

# Artemis scan configuration
ARTEMIS_SCAN_ARGS :=

###############################################################################
# Help target
###############################################################################

help:  ## Print this help text
	@echo
	@echo "${YELLOW}Usage:${CNone}"
	@echo " make <target>"
	@echo
	@echo "${YELLOW}Targets:${CNone}"
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(firstword $(MAKEFILE_LIST)) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
.PHONY: help

###############################################################################
# Testing targets
###############################################################################

$(ROOT_DIR)/.temp/detekt-${DETEKT_VER}/detekt.jar:
	mkdir -p $(@D)
	curl -sL "https://github.com/detekt/detekt/releases/download/v${DETEKT_VER}/detekt-cli-${DETEKT_VER}-all.jar" >$@
	echo "${DETEKT_SHA} $@" | sha256sum -c -

# The detekt wrapper script is renamed from detekt.sh to "detekt"
# This is for compatability with installations done via a package manager
$(ROOT_DIR)/.temp/detekt-${DETEKT_VER}/detekt:
	mkdir -p $(@D)
	cp ${ROOT_DIR}/engine/plugins/detekt/detekt.sh $@

get-detekt: $(ROOT_DIR)/.temp/detekt-${DETEKT_VER}/detekt.jar $(ROOT_DIR)/.temp/detekt-${DETEKT_VER}/detekt
.PHONY: get-detekt

${ROOT_DIR}/.temp/shellcheck-${SHELLCHECKVER}/shellcheck:
	mkdir -p $(@D)
	utilities/shellcheck-release-url.sh ${SHELLCHECKVER} > ${ROOT_DIR}/.temp/shellcheck-release.txt
	wget -q -i ${ROOT_DIR}/.temp/shellcheck-release.txt -O ${ROOT_DIR}/.temp/shellcheck-${SHELLCHECKVER}.tar.xz
	tar -xJf ${ROOT_DIR}/.temp/shellcheck-${SHELLCHECKVER}.tar.xz -C $(@D) --strip-components=1

get-shell-check: ${ROOT_DIR}/.temp/shellcheck-${SHELLCHECKVER}/shellcheck
.PHONY: get-shell-check

# This copies a script which mocks swiftlint for unit tests
# The script gets renamed from "swiftlint_mock.sh" to simply "swiftlint" to match the real binary name
$(ROOT_DIR)/.temp/swiftlint/swiftlint: ${ROOT_DIR}/engine/tests/data/swiftlint/swiftlint_mock.sh
	mkdir -p $(@D)
	cp $< $@

get-mock-swiftlint: $(ROOT_DIR)/.temp/swiftlint/swiftlint
.PHONY: get-mock-swiftlint

${ROOT_DIR}/.temp/trivy-${TRIVY_VER}/trivy:
	mkdir -p $(@D)
	wget -O - https://raw.githubusercontent.com/aquasecurity/trivy/${TRIVY_COMMIT}/contrib/install.sh | \
		sh -s -- -b $(@D) ${TRIVY_VER};

get-trivy: ${ROOT_DIR}/.temp/trivy-${TRIVY_VER}/trivy
.PHONY: get-trivy

install-plugin-dependencies:
	@echo "${INFO}Installing plugin dependencies..."
	${PYTHON} -m pipenv run pip install ${ROOT_DIR}/engine/plugins/github_repo_health/lib

define run-pytest
	@echo "${INFO}Running $1"
	export PATH='${ROOT_DIR}/.temp/shellcheck-${SHELLCHECKVER}:${ROOT_DIR}/.temp/detekt-${DETEKT_VER}:${ROOT_DIR}/.temp/swiftlint:${ROOT_DIR}/.temp/trivy-${TRIVY_VER}:${PATH}:'; \
	export PIPENV_DONT_LOAD_ENV=1; \
	${PYTHON} -m pipenv sync --dev; \
	${PYTHON} -m pipenv run pytest -c pytest.ini $2 ${PYTEST_EXTRA_ARGS};
	@echo "${OK}"
endef

test-deps: get-shell-check get-detekt get-mock-swiftlint get-trivy install-plugin-dependencies
.PHONY: test-deps

unit-test-no-deps:
	$(call run-pytest,unit tests,-m "not integtest and not end2end")
.PHONY: unit-test-no-deps

unit-test: test-deps
	$(call run-pytest,unit tests,-m "not integtest and not end2end")
.PHONY: unit-test

integration-test: test-deps
	$(call run-pytest,integration tests,-m "integtest")
.PHONY: integration-test

end2end-test: test-deps
	$(call run-pytest,end to end tests,-m "end2end")
.PHONY: end2end-test

test: test-deps style-test
	$(call run-pytest,all tests)
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

artemis_scan:
	@echo "${INFO}Running Artemis scan"
	$(CURDIR)/ci-tools/shell/artemis-scan.sh ${ARTEMIS_SCAN_ARGS} github ${REPO_NAME} ${BRANCH_NAME} ${SEVERITY_LEVELS}
.PHONY: artemis_scan

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
	${PIP} install lambdas/$* -t ${BUILD_DIR}/lambdas/$* --upgrade --no-deps --python-version ${LAMBDA_PYTHON_VER}
	cp lambdas/$*/handlers.py ${BUILD_DIR}/lambdas/$*
	mkdir -p ${DIST_DIR}/lambdas/$*
	cd ${BUILD_DIR}/lambdas/$*; zip -r ${DIST_DIR}/lambdas/$*.zip *
	@echo "${OK}"

lambdas:  ## Build lambdas
lambdas: dist/lambdas/api/authorizer.zip \
		 dist/lambdas/api/ci_tools.zip \
		 dist/lambdas/api/groups.zip \
		 dist/lambdas/api/groups_keys.zip \
		 dist/lambdas/api/groups_members.zip \
		 dist/lambdas/api/repo.zip \
		 dist/lambdas/api/sbom_components.zip \
		 dist/lambdas/api/sbom_licenses.zip \
		 dist/lambdas/api/scans_batch.zip \
		 dist/lambdas/api/search_repositories.zip \
		 dist/lambdas/api/search_scans.zip \
		 dist/lambdas/api/search_vulnerabilities.zip \
		 dist/lambdas/api/signin.zip \
		 dist/lambdas/api/system_allowlist.zip \
		 dist/lambdas/api/system_services.zip \
		 dist/lambdas/api/system_status.zip \
		 dist/lambdas/api/users.zip \
		 dist/lambdas/api/users_keys.zip \
		 dist/lambdas/api/users_services.zip \
		 dist/lambdas/events/event_dispatch.zip \
		 dist/lambdas/events/splunk_handler.zip \
		 dist/lambdas/generators/json_report.zip \
		 dist/lambdas/generators/pdf_report.zip \
		 dist/lambdas/generators/sbom_report.zip \
		 dist/lambdas/maintenance/db_cleanup.zip \
		 dist/lambdas/maintenance/license_retriever.zip \
		 dist/lambdas/maintenance/report_cleanup.zip \
		 dist/lambdas/maintenance/service_connection_metrics.zip \
		 dist/lambdas/scans/callback.zip \
		 dist/lambdas/scans/scale_down.zip \
		 dist/lambdas/scans/task_queue_metrics.zip \
		 dist/lambdas/scheduled/scan_scheduler.zip \
		 dist/lambdas/scheduled/scheduled_scan_handler.zip \
		 dist/lambdas/scheduled/update_github_org_users.zip \
		 lambda_layers
.PHONY: lambdas

###############################################################################
# Lambda Layers
###############################################################################
dist/lambdas/layers/backend_core.zip: ${SHARED_LIB_SRC} ${DB_LIB_SRC} ${API_LIB_SRC}
	@echo "${INFO} Creating ${BACKEND_CORE_LAMBDA_LAYER} Lambda Layer"
	mkdir -p ${LAMBDA_LAYERS_BUILD_DIR}/backend_core/python

	${PIP} install --upgrade --target ${LAMBDA_LAYERS_BUILD_DIR}/backend_core/python --python-version ${LAMBDA_PYTHON_VER} --no-deps ${ARTEMISLIB}
	${PIP} install --upgrade --target ${LAMBDA_LAYERS_BUILD_DIR}/backend_core/python --python-version ${LAMBDA_PYTHON_VER} --no-deps ${ARTEMISDB}
	${PIP} install --upgrade --target ${LAMBDA_LAYERS_BUILD_DIR}/backend_core/python --python-version ${LAMBDA_PYTHON_VER} --no-deps ${ARTEMISAPI}

	@echo "${INFO} Adding dependencies to Lambda Layer"
	${PYTHON} -m pipenv requirements > ${LAMBDA_LAYERS_BUILD_DIR}/requirements.txt
	${PIP} install -r ${LAMBDA_LAYERS_BUILD_DIR}/requirements.txt --upgrade --target ${LAMBDA_LAYERS_BUILD_DIR}/backend_core/python --python-version ${LAMBDA_PYTHON_VER} --only-binary=:all: ${LAMBDA_PLATFORM_FLAGS}

	mkdir -p ${DIST_DIR}/lambdas/layers/backend_core/python
	cd ${LAMBDA_LAYERS_BUILD_DIR}/backend_core; zip -r ${DIST_DIR}/lambdas/layers/backend_core.zip *
	@echo "${OK}"

lambda_layers:  ## Build lambda layers
lambda_layers: dist/lambdas/layers/backend_core.zip
.PHONY: lambda_layers

###############################################################################
# Scripts
###############################################################################

dist/engine_scripts.zip: docker-compose.aws.yml aws_env.py
	@echo "${INFO}Building $@"
	mkdir -p ${DIST_DIR}
	zip ${DIST_DIR}/engine_scripts.zip docker-compose.aws.yml aws_env.py
	@echo "${OK}"

###############################################################################
# Docker images
###############################################################################

dist/docker/engine: docker-bake.hcl Dockerfiles/Dockerfile.boxed Dockerfiles/Dockerfile.engine Pipfile Pipfile.lock $(ENGINE_SRC) $(DB_LIB_SRC) $(SHARED_LIB_SRC)
	@echo "${INFO}Building $@"
	MAINTAINER=${MAINTAINER} \
	ENGINE_BASE=${ENGINE_BASE} \
	ENGINE_TAG=${ENGINE_TAG} \
	ECR_URL=${ECR_URL} \
	LATEST_COMMIT=${LATEST_COMMIT} \
	${DOCKER} buildx bake -f docker-bake.hcl engine ${DOCKER_BUILD_EXTRA_ARGS}
	mkdir -p ${DIST_DIR}/docker
	touch $@
	@echo "${OK}"

dist/docker/python3: Dockerfiles/Dockerfile.python3
	@echo "${INFO}Building $@"
	$(DOCKER) build . --pull -t ${PYTHON_TAG} -f Dockerfiles/Dockerfile.python3 \
		${DOCKER_BUILD_EXTRA_ARGS} \
		--build-arg MAINTAINER=${MAINTAINER} \
		--build-arg GIT_SECRETS_VER=${GIT_SECRETS_VER} \
		--build-arg SHELL_CHECK_VER=${SHELLCHECKVER} \
		--build-arg SHELL_CHECK_SHA=${SHELLCHECKSHA} \
		--build-arg TFLINT_VER=${TFLINT_VER} \
		--build-arg TFLINT_SHA=${TFLINT_SHA} \
		--build-arg CFN_VER=${CFN_VER} \
		--build-arg PACKAGING_VER=${PACKAGING_VER}
	mkdir -p ${DIST_DIR}/docker
	${DOCKER} tag ${PYTHON_TAG} ${ECR_URL}${PYTHON_TAG}
	${DOCKER} tag ${PYTHON_TAG} ${ECR_URL}${PYTHON_TAG}-stage-${LATEST_COMMIT}
	touch $@
	@echo "${OK}"

dist/docker/node: Dockerfiles/Dockerfile.node
	@echo "${INFO}Building $@"
	$(DOCKER) build . --pull -t ${NODE_TAG} -f Dockerfiles/Dockerfile.node \
		${DOCKER_BUILD_EXTRA_ARGS} \
		--build-arg MAINTAINER=${MAINTAINER}
	mkdir -p ${DIST_DIR}/docker
	${DOCKER} tag ${NODE_TAG} ${ECR_URL}${NODE_TAG}
	${DOCKER} tag ${NODE_TAG} ${ECR_URL}${NODE_TAG}-stage-${LATEST_COMMIT}
	touch $@
	@echo "${OK}"
dist/docker/node14: dist/docker/node

dist/docker/php: Dockerfiles/Dockerfile.php
	@echo "${INFO}Building $@"
	$(DOCKER) build . --pull -t ${PHP_TAG} -f Dockerfiles/Dockerfile.php \
		${DOCKER_BUILD_EXTRA_ARGS} \
		--build-arg MAINTAINER=${MAINTAINER} \
		--build-arg PHP_SCANNER_VER=${PHP_SCANNER_VER}
	mkdir -p ${DIST_DIR}/docker
	${DOCKER} tag ${PHP_TAG} ${ECR_URL}${PHP_TAG}
	${DOCKER} tag ${PHP_TAG} ${ECR_URL}${PHP_TAG}-stage-${LATEST_COMMIT}
	touch $@
	@echo "${OK}"

dist/docker/dind: Dockerfiles/Dockerfile.dind
	@echo "${INFO}Building $@"
	$(DOCKER) build . --pull -t ${DIND_TAG} -f Dockerfiles/Dockerfile.dind \
		${DOCKER_BUILD_EXTRA_ARGS} \
		--build-arg MAINTAINER=${MAINTAINER} \
		--build-arg TRIVY_VER=${TRIVY_VER} \
		--build-arg TRIVY_COMMIT=${TRIVY_COMMIT} \
		--build-arg TRUFFLEHOG_VER=${TRUFFLEHOG_VER} \
		--build-arg TRUFFLEHOG_COMMIT=${TRUFFLEHOG_COMMIT} \
		--build-arg SNYK_VER=${SNYK_VER} \
		--build-arg SNYK_FLAG=${SNYK_FLAG}
	mkdir -p ${DIST_DIR}/docker
	${DOCKER} tag ${DIND_TAG} ${ECR_URL}${DIND_TAG}
	${DOCKER} tag ${DIND_TAG} ${ECR_URL}${DIND_TAG}-stage-${LATEST_COMMIT}
	touch $@
	@echo "${OK}"

dist/docker/golang: Dockerfiles/Dockerfile.golang
	@echo "${INFO}Building $@"
	$(DOCKER) build . --pull -t ${GOLANG_TAG} -f Dockerfiles/Dockerfile.golang \
		${DOCKER_BUILD_EXTRA_ARGS} \
		--build-arg MAINTAINER=${MAINTAINER} \
		--build-arg ENRYVER=${ENRYVER} \
		--build-arg ENRYSHA=${ENRYSHA} \
		--build-arg GOSECVER=${GOSECVER} \
		--build-arg GOSECSHA=${GOSECSHA}
	mkdir -p ${DIST_DIR}/docker
	${DOCKER} tag ${GOLANG_TAG} ${ECR_URL}${GOLANG_TAG}
	${DOCKER} tag ${GOLANG_TAG} ${ECR_URL}${GOLANG_TAG}-stage-${LATEST_COMMIT}
	touch $@
	@echo "${OK}"

dist/docker/ruby: Dockerfiles/Dockerfile.ruby
	@echo "${INFO}Building $@"
	$(DOCKER) build . --pull -t ${RUBY_TAG} -f Dockerfiles/Dockerfile.ruby \
		${DOCKER_BUILD_EXTRA_ARGS} \
		--build-arg MAINTAINER=${MAINTAINER} \
		--build-arg RUBY_VER=3.3-slim-bookworm
	mkdir -p ${DIST_DIR}/docker
	${DOCKER} tag ${RUBY_TAG} ${ECR_URL}${RUBY_TAG}
	${DOCKER} tag ${RUBY_TAG} ${ECR_URL}${RUBY_TAG}-stage-${LATEST_COMMIT}
	touch $@
	@echo "${OK}"

dist/docker/db_maintenance: libs/* utilities/db_maintenance/*
	@echo "${INFO}Building $@"
	$(DOCKER) build . --pull -t ${DB_MAINT_TAG} -f utilities/db_maintenance/Dockerfile \
		${DOCKER_BUILD_EXTRA_ARGS} \
		--build-arg MAINTAINER=${MAINTAINER}
	mkdir -p ${DIST_DIR}/docker
	${DOCKER} tag ${DB_MAINT_TAG} ${ECR_URL}${DB_MAINT_TAG}
	${DOCKER} tag ${DB_MAINT_TAG} ${ECR_URL}${DB_MAINT_TAG}-stage-${LATEST_COMMIT}
	touch $@
	@echo "${OK}"

dist/docker/veracode: Dockerfiles/Dockerfile.veracode
	@echo "${INFO}Veracode enabled: '${VERACODE_FLAG}'"
ifeq (${VERACODE_FLAG}, true)
	@echo "${INFO}Building $@"
	$(DOCKER) build . --pull -t ${VERACODE_TAG} -f Dockerfiles/Dockerfile.veracode \
		${DOCKER_BUILD_EXTRA_ARGS} \
		--build-arg MAINTAINER=${MAINTAINER}
	mkdir -p ${DIST_DIR}/docker
	${DOCKER} tag ${VERACODE_TAG} ${ECR_URL}${VERACODE_TAG}
	${DOCKER} tag ${VERACODE_TAG} ${ECR_URL}${VERACODE_TAG}-stage-${LATEST_COMMIT}
	touch $@
	@echo "${OK}"
endif

dist/docker/swift: Dockerfiles/Dockerfile.swift
	@echo "${INFO}Building $@"
	$(DOCKER) build . --pull  -t ${SWIFT_TAG} -f Dockerfiles/Dockerfile.swift \
		${DOCKER_BUILD_EXTRA_ARGS} \
		--build-arg MAINTAINER=${MAINTAINER} \
		--build-arg SWIFTLINT_VER=${SWIFTLINT_VER} \
		--build-arg SWIFTLINT_SHA=${SWIFTLINT_SHA}
	mkdir -p ${DIST_DIR}/docker
	if [ ! -z ${ACCOUNT_ID} ]; then \
		${DOCKER} tag ${SWIFT_TAG} ${ECR_URL}${SWIFT_TAG} ; \
		${DOCKER} tag ${SWIFT_TAG} ${ECR_URL}${SWIFT_TAG}-stage-${LATEST_COMMIT} ; \
	fi
	touch $@
	@echo "${OK}"

define docker-build-java
	MAINTAINER=${MAINTAINER} \
	DETEKT_VER=${DETEKT_VER} \
	DETEKT_SHA=${DETEKT_SHA} \
	FSB_VER=${FSB_VER} \
	FSB_PATCH=${FSB_PATCH} \
	OWASP_DC=${OWASP_DC} \
	OWASP_DC_SHA=${OWASP_DC_SHA} \
	JAVA8_TAG=${JAVA8_TAG} \
	JAVA11_TAG=${JAVA11_TAG} \
	JAVA17_TAG=${JAVA17_TAG} \
	JAVA21_TAG=${JAVA21_TAG} \
	ECR_URL=${ECR_URL} \
	LATEST_COMMIT=${LATEST_COMMIT} \
	${DOCKER} buildx bake --set *.platform=linux/amd64 -f docker-bake.hcl $1
endef

# Build an individual Java image.
# This is retained for convenience and backwards compatibility with older workflows.
dist/docker/java%: docker-bake.hcl Dockerfiles/Dockerfile.java
	@echo "${INFO}Building $@"
	$(call docker-build-java,$(@F))
	mkdir -p ${DIST_DIR}/docker
	touch $@
	@echo "${OK}"

# Build all Java images in parallel.
docker-java: docker-bake.hcl Dockerfiles/Dockerfile.java
	@echo "${INFO}Building $@"
	$(call docker-build-java,java)
	mkdir -p ${DIST_DIR}/docker
	touch dist/docker/java8
	touch dist/docker/java11
	touch dist/docker/java17
	touch dist/docker/java21
	@echo "${OK}"
.PHONY: docker-java

docker:  ## Build all docker images
docker: dist/docker/engine \
		dist/docker/python3 \
		dist/docker/node \
		dist/docker/php \
		dist/docker/dind \
		dist/docker/golang \
		docker-java \
		dist/docker/ruby \
		dist/docker/db_maintenance \
		dist/docker/veracode \
		dist/docker/swift
.PHONY: docker _docker

###############################################################################
# High-level build targets
###############################################################################

build:  ## Build all
build: lambdas \
	   docker \
	   dist/engine_scripts.zip
.PHONY: build

###############################################################################
# Staging
###############################################################################

stage/docker/engine: dist/docker/engine
	@echo "${INFO}Staging $@ in ECR"
	mkdir -p ${STAGE_DIR}/docker
	aws ecr get-login-password --region=${REGION} | docker login --username AWS --password-stdin ${ECR_URL}
	${DOCKER} push ${ECR_URL}${ENGINE_TAG}-stage-${LATEST_COMMIT}
	touch $@
	@echo "${OK}"

stage/docker/python3: dist/docker/python3
	@echo "${INFO}Staging $@ in ECR"
	mkdir -p ${STAGE_DIR}/docker
	aws ecr get-login-password --region=${REGION} | docker login --username AWS --password-stdin ${ECR_URL}
	${DOCKER} push ${ECR_URL}${PYTHON_TAG}-stage-${LATEST_COMMIT}
	touch $@
	@echo "${OK}"

stage/docker/node: dist/docker/node
	@echo "${INFO}Staging $@ in ECR"
	mkdir -p ${STAGE_DIR}/docker
	aws ecr get-login-password --region=${REGION} | docker login --username AWS --password-stdin ${ECR_URL}
	${DOCKER} push ${ECR_URL}${NODE_TAG}-stage-${LATEST_COMMIT}
	touch $@
	@echo "${OK}"
stage/docker/node14: stage/docker/node

stage/docker/php: dist/docker/php
	@echo "${INFO}Staging $@ in ECR"
	mkdir -p ${STAGE_DIR}/docker
	aws ecr get-login-password --region=${REGION} | docker login --username AWS --password-stdin ${ECR_URL}
	${DOCKER} push ${ECR_URL}${PHP_TAG}-stage-${LATEST_COMMIT}
	touch $@
	@echo "${OK}"

stage/docker/dind: dist/docker/dind
	@echo "${INFO}Staging $@ in ECR"
	mkdir -p ${STAGE_DIR}/docker
	aws ecr get-login-password --region=${REGION} | docker login --username AWS --password-stdin ${ECR_URL}
	${DOCKER} push ${ECR_URL}${DIND_TAG}-stage-${LATEST_COMMIT}
	touch $@
	@echo "${OK}"

stage/docker/golang: dist/docker/golang
	@echo "${INFO}Staging $@ in ECR"
	mkdir -p ${STAGE_DIR}/docker
	aws ecr get-login-password --region=${REGION} | docker login --username AWS --password-stdin ${ECR_URL}
	${DOCKER} push ${ECR_URL}${GOLANG_TAG}-stage-${LATEST_COMMIT}
	touch $@
	@echo "${OK}"

stage/docker/java11: dist/docker/java11
	@echo "${INFO}Staging $@ in ECR"
	mkdir -p ${STAGE_DIR}/docker
	aws ecr get-login-password --region=${REGION} | docker login --username AWS --password-stdin ${ECR_URL}
	${DOCKER} push ${ECR_URL}${JAVA11_TAG}-stage-${LATEST_COMMIT}
	touch $@
	@echo "${OK}"

stage/docker/java8: dist/docker/java8
	@echo "${INFO}Staging $@ in ECR"
	mkdir -p ${STAGE_DIR}/docker
	aws ecr get-login-password --region=${REGION} | docker login --username AWS --password-stdin ${ECR_URL}
	${DOCKER} push ${ECR_URL}${JAVA8_TAG}-stage-${LATEST_COMMIT}
	touch $@
	@echo "${OK}"

stage/docker/java21: dist/docker/java21
	@echo "${INFO}Staging $@ in ECR"
	mkdir -p ${STAGE_DIR}/docker
	aws ecr get-login-password --region=${REGION} | docker login --username AWS --password-stdin ${ECR_URL}
	${DOCKER} push ${ECR_URL}${JAVA21_TAG}-stage-${LATEST_COMMIT}
	touch $@
	@echo "${OK}"

stage/docker/java17: dist/docker/java17
	@echo "${INFO}Staging $@ in ECR"
	mkdir -p ${STAGE_DIR}/docker
	aws ecr get-login-password --region=${REGION} | docker login --username AWS --password-stdin ${ECR_URL}
	${DOCKER} push ${ECR_URL}${JAVA17_TAG}-stage-${LATEST_COMMIT}
	touch $@
	@echo "${OK}"

stage/docker/ruby: dist/docker/ruby
	@echo "${INFO}Staging $@ in ECR"
	mkdir -p ${STAGE_DIR}/docker
	aws ecr get-login-password --region=${REGION} | docker login --username AWS --password-stdin ${ECR_URL}
	${DOCKER} push ${ECR_URL}${RUBY_TAG}-stage-${LATEST_COMMIT}
	touch $@
	@echo "${OK}"

stage/docker/db_maintenance: dist/docker/db_maintenance
	@echo "${INFO}Staging $@ in ECR"
	mkdir -p ${STAGE_DIR}/docker
	aws ecr get-login-password --region=${REGION} | docker login --username AWS --password-stdin ${ECR_URL}
	${DOCKER} push ${ECR_URL}${DB_MAINT_TAG}-stage-${LATEST_COMMIT}
	touch $@
	@echo "${OK}"

stage/docker/veracode: dist/docker/veracode
ifeq (${VERACODE_FLAG}, true)
	@echo "${INFO}Staging $@ in ECR"
	mkdir -p ${STAGE_DIR}/docker
	aws ecr get-login-password --region=${REGION} | docker login --username AWS --password-stdin ${ECR_URL}
	${DOCKER} push ${ECR_URL}${VERACODE_TAG}-stage-${LATEST_COMMIT}
	touch $@
	@echo "${OK}"
endif

stage/docker/swift: dist/docker/swift
	@echo "${INFO}Staging $@ in ECR"
	mkdir -p ${STAGE_DIR}/docker
	aws ecr get-login-password --region=${REGION} | docker login --username AWS --password-stdin ${ECR_URL}
	${DOCKER} push ${ECR_URL}${SWIFT_TAG}-stage-${LATEST_COMMIT}
	touch $@
	@echo "${OK}"

docker_push:  ## Stage all docker images in ECR
docker_push: stage/docker/engine \
			 stage/docker/python3 \
			 stage/docker/node \
			 stage/docker/php \
			 stage/docker/dind \
			 stage/docker/golang \
			 stage/docker/java8 \
			 stage/docker/java11 \
			 stage/docker/java17 \
			 stage/docker/java21 \
			 stage/docker/ruby \
			 stage/docker/db_maintenance \
			 stage/docker/veracode \
			 stage/docker/swift
.PHONY: docker_push

upload_lambda_%:
	@echo "${INFO}Uploading $* lambda bundle"
	aws s3 cp ${DIST_DIR}/$(shell echo $* | sed "s/-/\//g").zip s3://${S3_BUCKET}/lambdas/$(shell echo $* | sed "s/.*-//g")/v${VERSION}/$(shell echo $* | sed "s/.*-//g")-stage-${LATEST_COMMIT}.zip
	@echo "${OK}"
.PHONY: upload_lambda_%

upload_lambdas:  ## Upload all lambdas to S3
upload_lambdas: lambdas \
				upload_lambda_lambdas-api-authorizer \
				upload_lambda_lambdas-api-ci_tools \
				upload_lambda_lambdas-api-groups \
				upload_lambda_lambdas-api-groups_keys \
				upload_lambda_lambdas-api-groups_members \
				upload_lambda_lambdas-api-repo \
				upload_lambda_lambdas-api-sbom_components \
				upload_lambda_lambdas-api-sbom_licenses \
				upload_lambda_lambdas-api-scans_batch \
				upload_lambda_lambdas-api-search_repositories \
				upload_lambda_lambdas-api-search_scans \
				upload_lambda_lambdas-api-search_vulnerabilities \
				upload_lambda_lambdas-api-signin \
				upload_lambda_lambdas-api-system_allowlist \
				upload_lambda_lambdas-api-system_services \
				upload_lambda_lambdas-api-system_status \
				upload_lambda_lambdas-api-users \
				upload_lambda_lambdas-api-users_keys \
				upload_lambda_lambdas-api-users_services \
				upload_lambda_lambdas-events-event_dispatch \
				upload_lambda_lambdas-events-splunk_handler \
				upload_lambda_lambdas-generators-json_report \
				upload_lambda_lambdas-generators-pdf_report \
				upload_lambda_lambdas-generators-sbom_report \
				upload_lambda_lambdas-maintenance-db_cleanup \
				upload_lambda_lambdas-maintenance-license_retriever \
				upload_lambda_lambdas-maintenance-report_cleanup \
				upload_lambda_lambdas-maintenance-service_connection_metrics \
				upload_lambda_lambdas-scans-callback \
				upload_lambda_lambdas-scans-scale_down \
				upload_lambda_lambdas-scans-task_queue_metrics \
				upload_lambda_lambdas-scheduled-update_github_org_users \
				upload_lambda_lambdas-scheduled-scan_scheduler \
				upload_lambda_lambdas-scheduled-scheduled_scan_handler
.PHONY: upload_lambdas

upload_lambda_layers: ## Upload All Lambda Layers to S3
upload_lambda_layers: upload_lambda_lambdas-layers-backend_core
.PHONY: upload_lambda_layers

stage_scripts: dist/engine_scripts.zip  ## Stage scripts in S3
	@echo "${INFO}Deploying scripts bundle"
	aws s3 cp ${DIST_DIR}/engine_scripts.zip s3://${S3_BUCKET}/scripts/v${VERSION}/engine_scripts-stage-${LATEST_COMMIT}.zip
	@echo "${OK}"
.PHONY: stage_scripts

stage_api_docs:  ## Stage API docs in S3
	@echo "${INFO}Staging API documentation"
	aws s3 cp ${DIST_DIR}/api/index.html s3://${S3_BUCKET}/api/index-stage-${LATEST_COMMIT}.html
	@echo "${OK}"
.PHONY: upload_api_docs

upload: upload_lambdas stage_scripts docker_push upload_lambda_layers## Upload all
.PHONY: upload

###############################################################################
# Deployment
###############################################################################

move_lambda_bundle_%:
	@echo "${INFO}Moving staged lambda bundle $* into place"
	aws s3 mv s3://${S3_BUCKET}/lambdas/$*/v${VERSION}/$*-stage-${LATEST_COMMIT}.zip s3://${S3_BUCKET}/lambdas/$*/v${VERSION}/$*.zip
	@echo "${OK}"
.PHONY: move_lambda_bundle_%

# This make target is not for use as part of the CI process. It is for when updated bundles need
# to be in the right spot in S3 for a Terraform-based deployment or redeployment of lambdas.
move_lambda_bundles:  ## Deploy move all staged lambda bundles into place
move_lambda_bundles: move_lambda_bundle_backend_core \
					 move_lambda_bundle_repo \
					 move_lambda_bundle_users \
					 move_lambda_bundle_users_keys \
					 move_lambda_bundle_users_services \
					 move_lambda_bundle_sbom_components \
					 move_lambda_bundle_sbom_licenses \
					 move_lambda_bundle_groups \
					 move_lambda_bundle_groups_keys \
					 move_lambda_bundle_groups_members \
					 move_lambda_bundle_search_repositories \
					 move_lambda_bundle_search_scans \
					 move_lambda_bundle_search_vulnerabilities \
					 move_lambda_bundle_system_allowlist \
					 move_lambda_bundle_system_services \
					 move_lambda_bundle_system_status \
					 move_lambda_bundle_ci_tools \
					 move_lambda_bundle_task_queue_metrics \
					 move_lambda_bundle_scale_down \
					 move_lambda_bundle_callback \
					 move_lambda_bundle_event_dispatch \
					 move_lambda_bundle_splunk_handler \
					 move_lambda_bundle_authorizer \
					 move_lambda_bundle_signin \
					 move_lambda_bundle_json_report \
					 move_lambda_bundle_pdf_report \
					 move_lambda_bundle_sbom_report \
					 move_lambda_bundle_report_cleanup \
					 move_lambda_bundle_update_github_org_users \
					 move_lambda_bundle_scan_scheduler \
					 move_lambda_bundle_scheduled_scan_handler \
					 move_lambda_bundle_scans_batch \
					 move_lambda_bundle_db_cleanup \
					 move_lambda_bundle_license_retriever \
					 move_lambda_bundle_service_connection_metrics
.PHONY: move_lambda_bundles

###############################################################################
# Lambda Deployment
###############################################################################

deploy_repo: move_lambda_bundle_repo
	@echo "${INFO}Deploying ${REPO_LAMBDA} function code"
	aws lambda update-function-code \
		--function-name ${REPO_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/repo/v${VERSION}/repo.zip
	@echo "${INFO}Waiting for ${REPO_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${REPO_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${REPO_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${REPO_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_repo

deploy_users: move_lambda_bundle_users
	@echo "${INFO}Deploying ${USERS_LAMBDA} lambda"
	aws lambda update-function-code \
		--function-name ${USERS_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/users/v${VERSION}/users.zip
	@echo "${INFO}Waiting for ${USERS_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${USERS_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${USERS_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${USERS_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_users

deploy_users_keys: move_lambda_bundle_users_keys
	@echo "${INFO}Deploying ${USERS_KEYS_LAMBDA} lambda"
	aws lambda update-function-code \
		--function-name ${USERS_KEYS_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/users_keys/v${VERSION}/users_keys.zip
	@echo "${INFO}Waiting for ${USERS_KEYS_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${USERS_KEYS_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${USERS_KEYS_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${USERS_KEYS_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_users_keys

deploy_users_services: move_lambda_bundle_users_services
	@echo "${INFO}Deploying users services lambda"
	aws lambda update-function-code \
		--function-name ${USERS_SERVICES_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/users_services/v${VERSION}/users_services.zip
	@echo "${INFO}Waiting for ${USERS_SERVICES_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${USERS_SERVICES_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${USERS_SERVICES_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${USERS_SERVICES_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_users_services

deploy_sbom_components: move_lambda_bundle_sbom_components
	@echo "${INFO}Deploying ${SBOM_COMPONENTS_LAMBDA} lambda"
	aws lambda update-function-code \
		--function-name ${SBOM_COMPONENTS_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/sbom_components/v${VERSION}/sbom_components.zip
	@echo "${INFO}Waiting for ${SBOM_COMPONENTS_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${SBOM_COMPONENTS_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${SBOM_COMPONENTS_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${SBOM_COMPONENTS_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_sbom_components

deploy_sbom_licenses: move_lambda_bundle_sbom_licenses
	@echo "${INFO}Deploying ${SBOM_LICENSES_LAMBDA} lambda"
	aws lambda update-function-code \
		--function-name ${SBOM_LICENSES_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/sbom_licenses/v${VERSION}/sbom_licenses.zip
	@echo "${INFO}Waiting for ${SBOM_LICENSES_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${SBOM_LICENSES_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${SBOM_LICENSES_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${SBOM_LICENSES_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_sbom_licenses

deploy_groups: move_lambda_bundle_groups
	@echo "${INFO}Deploying ${GROUPS_LAMBDA} lambda"
	aws lambda update-function-code \
		--function-name ${GROUPS_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/groups/v${VERSION}/groups.zip
	@echo "${INFO}Waiting for ${GROUPS_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${GROUPS_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${GROUPS_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${GROUPS_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_groups

deploy_groups_keys: move_lambda_bundle_groups_keys
	@echo "${INFO}Deploying ${GROUPS_KEYS_LAMBDA} lambda"
	aws lambda update-function-code \
		--function-name ${GROUPS_KEYS_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/groups_keys/v${VERSION}/groups_keys.zip
	@echo "${INFO}Waiting for ${GROUPS_KEYS_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${GROUPS_KEYS_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${GROUPS_KEYS_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${GROUPS_KEYS_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_groups_keys

deploy_groups_members: move_lambda_bundle_groups_members
	@echo "${INFO}Deploying groups members lambda"
	aws lambda update-function-code \
		--function-name ${GROUPS_MEMBERS_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/groups_members/v${VERSION}/groups_members.zip
	@echo "${INFO}Waiting for ${GROUPS_MEMBERS_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${GROUPS_MEMBERS_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${GROUPS_MEMBERS_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${GROUPS_MEMBERS_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_groups_members

deploy_search_repositories: move_lambda_bundle_search_repositories
	@echo "${INFO}Deploying ${SEARCH_REPOSITORIES_LAMBDA} lambda"
	aws lambda update-function-code \
		--function-name ${SEARCH_REPOSITORIES_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/search_repositories/v${VERSION}/search_repositories.zip
	@echo "${INFO}Waiting for ${SEARCH_REPOSITORIES_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${SEARCH_REPOSITORIES_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${SEARCH_REPOSITORIES_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${SEARCH_REPOSITORIES_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_search_repositories

deploy_search_scans: move_lambda_bundle_search_scans
	@echo "${INFO}Deploying ${SEARCH_SCANS_LAMBDA} lambda"
	aws lambda update-function-code \
		--function-name ${SEARCH_SCANS_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/search_scans/v${VERSION}/search_scans.zip
	@echo "${INFO}Waiting for ${SEARCH_SCANS_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${SEARCH_SCANS_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${SEARCH_SCANS_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${SEARCH_SCANS_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_search_scans

deploy_search_vulnerabilities: move_lambda_bundle_search_vulnerabilities
	@echo "${INFO}Deploying ${SEARCH_VULNERABILITIES_LAMBDA} lambda"
	aws lambda update-function-code \
		--function-name ${SEARCH_VULNERABILITIES_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/search_vulnerabilities/v${VERSION}/search_vulnerabilities.zip
	@echo "${INFO}Waiting for ${SEARCH_VULNERABILITIES_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${SEARCH_VULNERABILITIES_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${SEARCH_VULNERABILITIES_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${SEARCH_VULNERABILITIES_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_search_vulnerabilities

deploy_system_allowlist: move_lambda_bundle_system_allowlist
	@echo "${INFO}Deploying ${SYSTEM_ALLOWLIST_LAMBDA} lambda"
	aws lambda update-function-code \
		--function-name ${SYSTEM_ALLOWLIST_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/system_allowlist/v${VERSION}/system_allowlist.zip
	@echo "${INFO}Waiting for ${SYSTEM_ALLOWLIST_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${SYSTEM_ALLOWLIST_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${SYSTEM_ALLOWLIST_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${SYSTEM_ALLOWLIST_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_system_allowlist

deploy_system_services: move_lambda_bundle_system_services
	@echo "${INFO}Deploying ${SYSTEM_SERVICES_LAMBDA} lambda"
	aws lambda update-function-code \
		--function-name ${SYSTEM_SERVICES_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/system_services/v${VERSION}/system_services.zip
	@echo "${INFO}Waiting for ${SYSTEM_SERVICES_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${SYSTEM_SERVICES_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${SYSTEM_SERVICES_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${SYSTEM_SERVICES_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_system_services

deploy_system_status: move_lambda_bundle_system_status
	@echo "${INFO}Deploying ${SYSTEM_STATUS_LAMBDA} lambda"
	aws lambda update-function-code \
		--function-name ${SYSTEM_STATUS_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/system_status/v${VERSION}/system_status.zip
	@echo "${INFO}Waiting for ${SYSTEM_STATUS_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${SYSTEM_STATUS_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${SYSTEM_STATUS_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${SYSTEM_STATUS_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_system_status

deploy_ci_tools: move_lambda_bundle_ci_tools
	@echo "${INFO}Deploying ${CI_TOOLS_LAMBDA} lambda"
	aws lambda update-function-code \
		--function-name ${CI_TOOLS_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/ci_tools/v${VERSION}/ci_tools.zip
	@echo "${INFO}Waiting for ${CI_TOOLS_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${CI_TOOLS_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${CI_TOOLS_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${CI_TOOLS_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_ci_tools

deploy_task_queue_metrics: move_lambda_bundle_task_queue_metrics
	@echo "${INFO}Deploying ${TASK_QUEUE_METRICS_LAMBDA} lambda"
	aws lambda update-function-code \
		--function-name ${TASK_QUEUE_METRICS_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/task_queue_metrics/v${VERSION}/task_queue_metrics.zip
	@echo "${INFO}Waiting for ${TASK_QUEUE_METRICS_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${TASK_QUEUE_METRICS_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${TASK_QUEUE_METRICS_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${TASK_QUEUE_METRICS_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_task_queue_metrics

deploy_scale_down: move_lambda_bundle_scale_down
	@echo "${INFO}Deploying ${SCALE_DOWN_LAMBDA_NAT} lambda"
	aws lambda update-function-code \
		--function-name ${SCALE_DOWN_LAMBDA_NAT} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/scale_down/v${VERSION}/scale_down.zip
	@echo "${INFO}Waiting for ${SCALE_DOWN_LAMBDA_NAT} update to complete"
	aws lambda wait function-updated --function-name ${SCALE_DOWN_LAMBDA_NAT} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${SCALE_DOWN_LAMBDA_NAT} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${SCALE_DOWN_LAMBDA_NAT} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Deploying ${SCALE_DOWN_LAMBDA_PUBLIC} lambda"
	aws lambda update-function-code \
		--function-name ${SCALE_DOWN_LAMBDA_PUBLIC} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/scale_down/v${VERSION}/scale_down.zip
	@echo "${INFO}Waiting for ${SCALE_DOWN_LAMBDA_PUBLIC} update to complete"
	aws lambda wait function-updated --function-name ${SCALE_DOWN_LAMBDA_PUBLIC} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${SCALE_DOWN_LAMBDA_PUBLIC} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${SCALE_DOWN_LAMBDA_PUBLIC} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_scale_down_nat

deploy_callback: move_lambda_bundle_callback
	@echo "${INFO}Deploying ${CALLBACK_LAMBDA} lambda"
	aws lambda update-function-code \
		--function-name ${CALLBACK_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/callback/v${VERSION}/callback.zip
	@echo "${INFO}Waiting for ${CALLBACK_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${CALLBACK_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${CALLBACK_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${CALLBACK_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_callback

deploy_event_dispatch: move_lambda_bundle_event_dispatch
	@echo "${INFO}Deploying ${EVENT_DISPATCH_LAMBDA} lambda"
	aws lambda update-function-code \
		--function-name ${EVENT_DISPATCH_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/event_dispatch/v${VERSION}/event_dispatch.zip
	@echo "${INFO}Waiting for ${EVENT_DISPATCH_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${EVENT_DISPATCH_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${EVENT_DISPATCH_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${EVENT_DISPATCH_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_event_dispatch

deploy_splunk_handler: move_lambda_bundle_splunk_handler
	@echo "${INFO}Deploying ${AUDIT_EVENT_LAMBDA} lambda"
	aws lambda update-function-code \
		--function-name ${AUDIT_EVENT_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/splunk_handler/v${VERSION}/splunk_handler.zip
	@echo "${INFO}Waiting for ${AUDIT_EVENT_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${AUDIT_EVENT_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${AUDIT_EVENT_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${AUDIT_EVENT_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_splunk_handler

deploy_api_authorizer: move_lambda_bundle_authorizer
	@echo "${INFO}Deploying ${API_AUTHORIZER_LAMBDA} lambda"
	aws lambda update-function-code \
		--function-name ${API_AUTHORIZER_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/authorizer/v${VERSION}/authorizer.zip
	@echo "${INFO}Waiting for ${API_AUTHORIZER_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${API_AUTHORIZER_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${API_AUTHORIZER_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${API_AUTHORIZER_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_api_authorizer

deploy_signin: move_lambda_bundle_signin
	@echo "${INFO}Deploying ${SIGNIN_LAMBDA} lambda"
	aws lambda update-function-code \
		--function-name ${SIGNIN_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/signin/v${VERSION}/signin.zip
	@echo "${INFO}Waiting for ${SIGNIN_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${SIGNIN_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${SIGNIN_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${SIGNIN_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_signin

deploy_json_report: move_lambda_bundle_json_report
	@echo "${INFO}Deploying ${JSON_REPORT_LAMBDA} lambda"
	aws lambda update-function-code \
		--function-name ${JSON_REPORT_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/json_report/v${VERSION}/json_report.zip
	@echo "${INFO}Waiting for ${JSON_REPORT_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${JSON_REPORT_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${JSON_REPORT_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${JSON_REPORT_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_json_report

deploy_pdf_report: move_lambda_bundle_pdf_report
	@echo "${INFO}Deploying ${PDF_REPORT_LAMBDA} lambda"
	aws lambda update-function-code \
		--function-name ${PDF_REPORT_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/pdf_report/v${VERSION}/pdf_report.zip
	@echo "${INFO}Waiting for ${PDF_REPORT_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${PDF_REPORT_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${PDF_REPORT_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${PDF_REPORT_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_pdf_report

deploy_sbom_report: move_lambda_bundle_sbom_report
	@echo "${INFO}Deploying ${SBOM_REPORT_LAMBDA} lambda"
	aws lambda update-function-code \
		--function-name ${SBOM_REPORT_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/sbom_report/v${VERSION}/sbom_report.zip
	@echo "${INFO}Waiting for ${SBOM_REPORT_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${SBOM_REPORT_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${SBOM_REPORT_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${SBOM_REPORT_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_sbom_report

deploy_report_cleanup: move_lambda_bundle_report_cleanup
	@echo "${INFO}Deploying ${REPORT_CLEANUP_LAMBDA} lambda"
	aws lambda update-function-code \
		--function-name ${REPORT_CLEANUP_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/report_cleanup/v${VERSION}/report_cleanup.zip
	@echo "${INFO}Waiting for ${REPORT_CLEANUP_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${REPORT_CLEANUP_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${REPORT_CLEANUP_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${REPORT_CLEANUP_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_report_cleanup

deploy_update_github_org_users: move_lambda_bundle_update_github_org_users
	@echo "${INFO}Deploying ${UPDATE_GITHUB_ORG_USERS_LAMBDA} lambda"
	aws lambda update-function-code \
		--function-name ${UPDATE_GITHUB_ORG_USERS_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/update_github_org_users/v${VERSION}/update_github_org_users.zip
	@echo "${INFO}Waiting for ${UPDATE_GITHUB_ORG_USERS_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${UPDATE_GITHUB_ORG_USERS_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${UPDATE_GITHUB_ORG_USERS_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${UPDATE_GITHUB_ORG_USERS_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_update_github_org_users

deploy_scan_scheduler: move_lambda_bundle_scan_scheduler
	@echo "${INFO}Deploying ${SCAN_SCHEDULER_LAMBDA} lambda"
	aws lambda update-function-code \
		--function-name ${SCAN_SCHEDULER_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/scan_scheduler/v${VERSION}/scan_scheduler.zip
	@echo "${INFO}Waiting for ${SCAN_SCHEDULER_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${SCAN_SCHEDULER_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${SCAN_SCHEDULER_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${SCAN_SCHEDULER_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_scan_scheduler

deploy_scheduled_scan_handler: move_lambda_bundle_scheduled_scan_handler
	@echo "${INFO}Deploying ${SCHEDULED_SCAN_HANDLER_LAMBDA} lambda"
	aws lambda update-function-code \
		--function-name ${SCHEDULED_SCAN_HANDLER_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/scheduled_scan_handler/v${VERSION}/scheduled_scan_handler.zip
	@echo "${INFO}Waiting for ${SCHEDULED_SCAN_HANDLER_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${SCHEDULED_SCAN_HANDLER_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${SCHEDULED_SCAN_HANDLER_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${SCHEDULED_SCAN_HANDLER_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_scheduled_scan_handler

deploy_scans_batch: move_lambda_bundle_scans_batch
	@echo "${INFO}Deploying ${SCANS_BATCH_LAMBDA} lambda"
	aws lambda update-function-code \
		--function-name ${SCANS_BATCH_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/scans_batch/v${VERSION}/scans_batch.zip
	@echo "${INFO}Waiting for ${SCANS_BATCH_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${SCANS_BATCH_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${SCANS_BATCH_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${SCANS_BATCH_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_scans_batch

deploy_db_cleanup: move_lambda_bundle_db_cleanup
	@echo "${INFO}Deploying ${DB_CLEANUP_LAMBDA} lambda"
	aws lambda update-function-code \
		--function-name ${DB_CLEANUP_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/db_cleanup/v${VERSION}/db_cleanup.zip
	@echo "${INFO}Waiting for ${DB_CLEANUP_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${DB_CLEANUP_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${DB_CLEANUP_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${DB_CLEANUP_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_db_cleanup

deploy_license_retriever: move_lambda_bundle_license_retriever
	@echo "${INFO}Deploying ${LICENSE_RETRIEVER_LAMBDA} lambda"
	aws lambda update-function-code \
		--function-name ${LICENSE_RETRIEVER_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/license_retriever/v${VERSION}/license_retriever.zip
	@echo "${INFO}Waiting for ${LICENSE_RETRIEVER_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${LICENSE_RETRIEVER_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${LICENSE_RETRIEVER_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${LICENSE_RETRIEVER_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_license_retriever

deploy_service_connection_metrics: move_lambda_bundle_service_connection_metrics
	@echo "${INFO}Deploying ${SERVICE_CONNECTION_METRICS_LAMBDA} lambda"
	aws lambda update-function-code \
		--function-name ${SERVICE_CONNECTION_METRICS_LAMBDA} \
		--region ${REGION} \
		--s3-bucket ${S3_BUCKET} \
		--s3-key lambdas/service_connection_metrics/v${VERSION}/service_connection_metrics.zip
	@echo "${INFO}Waiting for ${SERVICE_CONNECTION_METRICS_LAMBDA} update to complete"
	aws lambda wait function-updated --function-name ${SERVICE_CONNECTION_METRICS_LAMBDA} --region ${REGION}
	@echo "${OK}"
	@echo "${INFO}Updating ${SERVICE_CONNECTION_METRICS_LAMBDA} layer configuration"
	@build_scripts/update_lambda_layers.py --function-name ${SERVICE_CONNECTION_METRICS_LAMBDA} --region ${REGION}
	@echo "${OK}"
.PHONY: deploy_service_connection_metrics

###############################################################################
# Lambda Layer Deployment
###############################################################################
deploy_backend_core_layer: move_lambda_bundle_backend_core
	@echo "${INFO}Deploying ${BACKEND_CORE_LAMBDA_LAYER} Lambda Layer"
	aws lambda publish-layer-version \
		--layer-name ${BACKEND_CORE_LAMBDA_LAYER} \
		--region ${REGION} \
		--content S3Bucket=${S3_BUCKET},S3Key=lambdas/backend_core/v${VERSION}/backend_core.zip \
		--compatible-runtimes python${LAMBDA_PYTHON_VER}
	@echo "${OK}"

deploy_lambda_layers:  ## Deploy lambda layers
deploy_lambda_layers: deploy_backend_core_layer
.PHONY: deploy_lambda_layers

deploy_lambdas:  ## Deploy all lambda functions
deploy_lambdas: deploy_repo \
				deploy_users \
				deploy_users_keys \
				deploy_users_services \
				deploy_sbom_components \
				deploy_sbom_licenses \
				deploy_groups \
				deploy_groups_keys \
				deploy_groups_members \
				deploy_search_repositories \
				deploy_search_scans \
				deploy_search_vulnerabilities \
				deploy_system_allowlist \
				deploy_system_services \
				deploy_system_status \
				deploy_task_queue_metrics \
				deploy_scale_down \
				deploy_callback \
				deploy_event_dispatch \
				deploy_splunk_handler \
				deploy_api_authorizer \
				deploy_signin \
				deploy_json_report \
				deploy_pdf_report \
				deploy_sbom_report \
				deploy_report_cleanup \
				deploy_update_github_org_users \
				deploy_scan_scheduler \
				deploy_scheduled_scan_handler \
				deploy_ci_tools \
				deploy_scans_batch \
				deploy_db_cleanup \
				deploy_license_retriever \
				deploy_service_connection_metrics
.PHONY: deploy_lambdas

deploy_scripts:  ## Deploy scripts to S3
	@echo "${INFO}Deploying scripts bundle"
	aws s3 mv s3://${S3_BUCKET}/scripts/v${VERSION}/engine_scripts-stage-${LATEST_COMMIT}.zip s3://${S3_BUCKET}/scripts/v${VERSION}/engine_scripts.zip
	@echo "${OK}"
.PHONY: deploy_scripts

deploy_api_docs:  ## Deploy API docs to the docs S3 bucket
	@echo "${INFO}Deploying API documentation"
	aws s3 cp s3://${S3_BUCKET}/api/index-stage-${LATEST_COMMIT}.html s3://${S3_DOCS_BUCKET}/api/index.html
	@echo "${OK}"
.PHONY: upload_api_docs

deploy_ci_tools_scripts:  ## Deploy CI tools to S3
	@echo "${INFO}Deploying CI tools"
	mkdir -p ${DIST_DIR}/ci-tools
	cp -r ci-tools/* ${DIST_DIR}/ci-tools
	sed -i'' -e 's/$${ARTEMIS_FQDN:-}/${ARTEMIS_FQDN}/g' ${DIST_DIR}/ci-tools/shell/artemis-scan.sh
	aws s3 cp --recursive ${DIST_DIR}/ci-tools s3://${S3_BUCKET}/ci-tools
	@echo "${OK}"
.PHONY: deploy_ci_tools_scripts

deploy_engine_image:
	@echo "${INFO}Moving staged engine image into place"
	aws ecr get-login-password --region=${REGION} | docker login --username AWS --password-stdin ${ECR_URL}
	docker pull ${ECR_URL}${ENGINE_TAG}-stage-${LATEST_COMMIT}
	docker tag ${ECR_URL}${ENGINE_TAG}-stage-${LATEST_COMMIT} ${ECR_URL}${ENGINE_TAG}
	docker push ${ECR_URL}${ENGINE_TAG}
	@echo "${OK}"
.PHONY: deploy_engine_image

deploy_python_image:
	@echo "${INFO}Moving staged python image into place"
	aws ecr get-login-password --region=${REGION} | docker login --username AWS --password-stdin ${ECR_URL}
	docker pull ${ECR_URL}${PYTHON_TAG}-stage-${LATEST_COMMIT}
	docker tag ${ECR_URL}${PYTHON_TAG}-stage-${LATEST_COMMIT} ${ECR_URL}${PYTHON_TAG}
	docker push ${ECR_URL}${PYTHON_TAG}
	@echo "${OK}"
.PHONY: deploy_python_image

deploy_node_image:
	@echo "${INFO}Moving staged node image into place"
	aws ecr get-login-password --region=${REGION} | docker login --username AWS --password-stdin ${ECR_URL}
	docker pull ${ECR_URL}${NODE_TAG}-stage-${LATEST_COMMIT}
	docker tag ${ECR_URL}${NODE_TAG}-stage-${LATEST_COMMIT} ${ECR_URL}${NODE_TAG}
	docker push ${ECR_URL}${NODE_TAG}
	@echo "${OK}"
.PHONY: deploy_node_image

deploy_node14_image: deploy_node_image
.PHONY: deploy_node14_image

deploy_php_image:
	@echo "${INFO}Moving staged php image into place"
	aws ecr get-login-password --region=${REGION} | docker login --username AWS --password-stdin ${ECR_URL}
	docker pull ${ECR_URL}${PHP_TAG}-stage-${LATEST_COMMIT}
	docker tag ${ECR_URL}${PHP_TAG}-stage-${LATEST_COMMIT} ${ECR_URL}${PHP_TAG}
	docker push ${ECR_URL}${PHP_TAG}
	@echo "${OK}"
.PHONY: deploy_node_image

deploy_dind_image:
	@echo "${INFO}Moving staged dind image into place"
	aws ecr get-login-password --region=${REGION} | docker login --username AWS --password-stdin ${ECR_URL}
	docker pull ${ECR_URL}${DIND_TAG}-stage-${LATEST_COMMIT}
	docker tag ${ECR_URL}${DIND_TAG}-stage-${LATEST_COMMIT} ${ECR_URL}${DIND_TAG}
	docker push ${ECR_URL}${DIND_TAG}
	@echo "${OK}"
.PHONY: deploy_dind_image

deploy_golang_image:
	@echo "${INFO}Moving staged golang image into place"
	aws ecr get-login-password --region=${REGION} | docker login --username AWS --password-stdin ${ECR_URL}
	docker pull ${ECR_URL}${GOLANG_TAG}-stage-${LATEST_COMMIT}
	docker tag ${ECR_URL}${GOLANG_TAG}-stage-${LATEST_COMMIT} ${ECR_URL}${GOLANG_TAG}
	docker push ${ECR_URL}${GOLANG_TAG}
	@echo "${OK}"
.PHONY: deploy_golang_image

deploy_java11_image:
	@echo "${INFO}Moving staged java11 image into place"
	aws ecr get-login-password --region=${REGION} | docker login --username AWS --password-stdin ${ECR_URL}
	docker pull ${ECR_URL}${JAVA11_TAG}-stage-${LATEST_COMMIT}
	docker tag ${ECR_URL}${JAVA11_TAG}-stage-${LATEST_COMMIT} ${ECR_URL}${JAVA11_TAG}
	docker push ${ECR_URL}${JAVA11_TAG}
	@echo "${OK}"
.PHONY: deploy_java11_image

deploy_java8_image:
	@echo "${INFO}Moving staged java8 image into place"
	aws ecr get-login-password --region=${REGION} | docker login --username AWS --password-stdin ${ECR_URL}
	docker pull ${ECR_URL}${JAVA8_TAG}-stage-${LATEST_COMMIT}
	docker tag ${ECR_URL}${JAVA8_TAG}-stage-${LATEST_COMMIT} ${ECR_URL}${JAVA8_TAG}
	docker push ${ECR_URL}${JAVA8_TAG}
	@echo "${OK}"
.PHONY: deploy_java8_image

deploy_java21_image:
	@echo "${INFO}Moving staged java21 image into place"
	aws ecr get-login-password --region=${REGION} | docker login --username AWS --password-stdin ${ECR_URL}
	docker pull ${ECR_URL}${JAVA21_TAG}-stage-${LATEST_COMMIT}
	docker tag ${ECR_URL}${JAVA21_TAG}-stage-${LATEST_COMMIT} ${ECR_URL}${JAVA21_TAG}
	docker push ${ECR_URL}${JAVA21_TAG}
	@echo "${OK}"
.PHONY: deploy_java21_image

deploy_java17_image:
	@echo "${INFO}Moving staged java17 image into place"
	aws ecr get-login-password --region=${REGION} | docker login --username AWS --password-stdin ${ECR_URL}
	docker pull ${ECR_URL}${JAVA17_TAG}-stage-${LATEST_COMMIT}
	docker tag ${ECR_URL}${JAVA17_TAG}-stage-${LATEST_COMMIT} ${ECR_URL}${JAVA17_TAG}
	docker push ${ECR_URL}${JAVA17_TAG}
	@echo "${OK}"
.PHONY: deploy_java17_image

deploy_ruby_image:
	@echo "${INFO}Moving staged ruby image into place"
	aws ecr get-login-password --region=${REGION} | docker login --username AWS --password-stdin ${ECR_URL}
	docker pull ${ECR_URL}${RUBY_TAG}-stage-${LATEST_COMMIT}
	docker tag ${ECR_URL}${RUBY_TAG}-stage-${LATEST_COMMIT} ${ECR_URL}${RUBY_TAG}
	docker push ${ECR_URL}${RUBY_TAG}
	@echo "${OK}"
.PHONY: deploy_ruby_image

deploy_db_maint_image:
	@echo "${INFO}Moving staged db_maintenance image into place"
	aws ecr get-login-password --region=${REGION} | docker login --username AWS --password-stdin ${ECR_URL}
	docker pull ${ECR_URL}${DB_MAINT_TAG}-stage-${LATEST_COMMIT}
	docker tag ${ECR_URL}${DB_MAINT_TAG}-stage-${LATEST_COMMIT} ${ECR_URL}${DB_MAINT_TAG}
	docker push ${ECR_URL}${DB_MAINT_TAG}
	@echo "${OK}"
.PHONY: deploy_db_maint_image

deploy_veracode_image:
ifeq (${VERACODE_FLAG}, true)
	@echo "${INFO}Moving staged veracode image into place"
	aws ecr get-login-password --region=${REGION} | docker login --username AWS --password-stdin ${ECR_URL}
	docker pull ${ECR_URL}${VERACODE_TAG}-stage-${LATEST_COMMIT}
	docker tag ${ECR_URL}${VERACODE_TAG}-stage-${LATEST_COMMIT} ${ECR_URL}${VERACODE_TAG}
	docker push ${ECR_URL}${VERACODE_TAG}
	@echo "${OK}"
endif
.PHONY: deploy_veracode_image

deploy_swift_image:
	@echo "${INFO}Moving staged swift image into place"
	aws ecr get-login-password --region=${REGION} | docker login --username AWS --password-stdin ${ECR_URL}
	docker pull ${ECR_URL}${SWIFT_TAG}-stage-${LATEST_COMMIT}
	docker tag ${ECR_URL}${SWIFT_TAG}-stage-${LATEST_COMMIT} ${ECR_URL}${SWIFT_TAG}
	docker push ${ECR_URL}${SWIFT_TAG}
	@echo "${OK}"
.PHONY: deploy_swift_image

deploy_images: deploy_engine_image \
        	   deploy_python_image \
        	   deploy_node_image \
        	   deploy_php_image \
        	   deploy_dind_image \
        	   deploy_golang_image \
        	   deploy_java8_image \
        	   deploy_java11_image \
        	   deploy_java17_image \
        	   deploy_java21_image \
        	   deploy_ruby_image \
        	   deploy_db_maint_image \
        	   deploy_veracode_image \
        	   deploy_swift_image
.PHONY: deploy_images

deploy_engine:  ## Deploy the engine
	@echo "${INFO}Redeploying engine cluster"
	@build_scripts/redeploy_engine.sh ${PREFIX} ${REGION}
	@echo "${OK}"
.PHONY: deploy_engine

deploy:  ## Deploy all
deploy: deploy_lambda_layers \
		deploy_lambdas \
		deploy_scripts \
		deploy_engine \
		deploy_api_docs \
		deploy_ci_tools_scripts
.PHONY: deploy

###############################################################################
# All
###############################################################################

all: test build upload deploy  ## Do everything (test, build, upload, deploy)
.PHONY: all

###############################################################################
# Cleanup
###############################################################################

clean:  ## Clean all
	@echo "${INFO}Cleaning"
	rm -rf ${BUILD_DIR}
	rm -rf ${DIST_DIR}
	rm -rf ${STAGE_DIR}
	rm -rf venv
	rm -rf .pytest_cache
	rm -rf .ruff_cache
	rm -rf htmlcov
	rm -rf .coverage
	rm -rf .temp
	find . -name "__pycache__" -type d | xargs rm -r
	find . -name ".eggs" -type d | xargs rm -r
	find . -name "*.egg-info" -type d | xargs rm -r
	find . -name "build" -type d | xargs rm -r
	@echo "${OK}"
.PHONY: clean
