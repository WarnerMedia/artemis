# thin wrapper around npm scripts for usage as make commands
BASH_ENV := ~/.bashrc
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

DOCKER = docker
NODE = node
NPM = npm
SERVE = serve
HADOLINT = $(shell which hadolint)
ifeq ($(HADOLINT),)
	HADOLINT := ${CURDIR}/hadolint
endif
TERRAFORM = terraform

APP := artemis-ui
PORT := 3000
VER := $(shell jq -r .version package.json)
USER := $(shell id -un)
PWD := $(shell pwd)
DISTDIR := build
BUILDCMD := $(NPM) run build:nonprod

IMAGE_NAME := $(USER)/$(APP):$(VER)
SRC = $(shell find src -type f -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx')

# Default to nonprod
ENV ?= nonprod

# Override for prod
# Make profiles must define the following variables:
#   CHECK_AWS_PROFILE := Name of the AWS account profile to deploy to
#   S3_BUCKET := Name of the AWS S3 bucket to deploy to
#   CLOUDFRONT_DIST_ID := Name of the AWS CloudFront ID for clearing static file cache
ifeq ($(ENV),prod)
	include prod.mk
	BUILDCMD := $(NPM) run build
else
	include nonprod.mk
endif
export ENV
export CHECK_AWS_PROFILE
export S3_BUCKET
export CLOUDFRONT_DIST_ID
export DISTDIR

###############################################################################
# Help target
###############################################################################

.PHONY: help
help:  ## Print this help text
	@echo
	@echo "${YELLOW}Usage:${CNone}"
	@echo " make <target>"
	@echo
	@echo "${YELLOW}Targets:${CNone}"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(firstword $(MAKEFILE_LIST)) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

###############################################################################
# Cleanup targets
###############################################################################

.PHONY: clean
clean:  ## Remove production build files
	@echo "${INFO}Removing production build files"
	rm -rf $(DISTDIR)
	@echo "${OK}"

.PHONY: distclean
distclean: clean  ## Remove all build and dev transients
	@echo "${INFO}Removing all build and dev transients"
	rm -rf node_modules
	rm -f *.log*
	$(DOCKER) rmi -f $(IMAGE_NAME)
	@echo "${OK}"

###############################################################################
# Production build targets
###############################################################################

.PHONY: all
all: dist  ## Create production build

.PHONY: build dist
build dist: $(SRC) clean  ## Create production build
	@echo "${INFO}Creating production build"
	$(BUILDCMD)
	@echo "${OK}"

###############################################################################
# Deploy app => S3 targets
#
# Note: minified code will have different filenames to cache-bust,
# so first remove old deployed files before re-deploying
#
###############################################################################

	
.PHONY: deploy
deploy: dist ## Deploy app to S3
	./deploy.sh

.PHONY: ci-deploy
ci-deploy: dist  ## Deploy app to S3
	./deploy.sh ci

###############################################################################
# Serve local dev site targets
###############################################################################

.PHONY: install
install: package.json package-lock.json  ## Install all NPM dependency packages
	@echo "${INFO}Installing all NPM dependency packages"
	@echo "node version is: "
	$(NODE) -v
	@echo "npm version is: "
	$(NPM) -v
	$(NPM) ci
	$(NPM) ls -a
	@echo "${OK}"

.PHONY: start	
start: $(SRC)  ## Serve the app in development mode
	@echo "${INFO}Serving the app in development mode"
	-$(NPM) start

# serve "production" build (locally)
.PHONY: serve
serve: dist  ## Serve the app in production mode
	@echo "${INFO}Serving the app in production mode"
	$(SERVE) -s $(DISTDIR) -l $(PORT)

###############################################################################
# Testing targets
###############################################################################

.PHONY: eslint
eslint: $(SRC)  ## Lint JavaScript/TypeScript files
	@echo "${INFO}Linting JavaScript/TypeScript files"
	$(NPM) run eslint
	@echo "${OK}"

.PHONY: dockerlint
dockerlint: Dockerfile.dev  ## Lint Docker files
	@echo "${INFO}Linting Docker files"
	$(HADOLINT) Dockerfile.dev
	@echo "${OK}"

.PHONY: mdlint
mdlint: README.md  ## Lint Markdown files
	@echo "${INFO}Linting Markdown files"
	$(NPM) run mdlint
	@echo "${OK}"

.PHONY: redocly-lint
redocly-lint: api/spec.yaml  ## Lint API specification
	@echo "${INFO}Linting API specification"
	$(NPM) run redocly-lint
	@echo "${OK}"

.PHONY: lint
lint: $(SRC)  ## Run all linting
	@echo "${INFO}Running all linting"
	$(NPM) run lint

.PHONY: outdated
outdated: package.json package-lock.json  ## Check for outdated package dependencies
	@echo "${INFO}Checking for outdated package dependencies"
	$(NPM) outdated
	@echo "${OK}"

.PHONY: audit
audit: package.json package-lock.json  ## Audit package dependencies for vulnerabilities
	@echo "${INFO}Auditing package dependencies for vulnerabilities"
	$(NPM) audit --only=prod
	@echo "${OK}"

# Enable non-interactive test mode with CI=true
.PHONY: test
test:  ## Run tests
	@echo "${INFO}Running tests"
	CI=true $(NPM) test -- --env=jsdom --coverage --silent
	@echo "${OK}"

# run coding standards check
.PHONY: check
check: $(SRC)  ## Check code style
	@echo "${INFO}Checking code style"
	$(NPM) run prettier-check
	$(TERRAFORM) fmt -check -recursive terraform
	@echo "${OK}"

# run coding standards auto-fix
.PHONY: fix
fix: $(SRC)  ## Fix code style
	@echo "${INFO}Fixing code style"
	$(NPM) run prettier-write
	@echo "${OK}"

.PHONY: precommit
precommit: lint check audit test ## Run all linting, style checks, and vulnerability auditing

###############################################################################
# Docker image targets
###############################################################################

# build a dev ui docker image that can be run with "make run"
.PHONY: image
image: Dockerfile.dev package.json package-lock.json hadolint.sha512 $(SRC)  ## Build Docker image for development
	@echo "${INFO}Building Docker image for development"
	$(DOCKER) build \
		--pull \
		-f Dockerfile.dev \
		-t $(IMAGE_NAME) .
	@echo "${OK}"

# run dev ui in docker image, access via http://localhost:3000
.PHONY: run
run: image  ## Run developer web UI in Docker image
	@echo "${INFO}Running developer web UI in Docker image"
	$(DOCKER) run --rm -it -p $(PORT):$(PORT) $(IMAGE_NAME)

# run docker container shell, so you can execute linting and other checks
.PHONY: exec
exec: image  ## Run developer Docker image command shell
	@echo "${INFO}Running developer Docker image command shell"
	$(DOCKER) run --rm -it -p $(PORT):$(PORT) $(IMAGE_NAME) /bin/bash

# run build pre-commit checks in a container
.PHONY: image-precommit
image-precommit: image  ## Run developer Docker image precommit checks
	@echo "${INFO}Running developer Docker image command shell"
	$(DOCKER) run --rm $(IMAGE_NAME) make precommit

###############################################################################
# I18n targets
###############################################################################

# extract message catalogs for lingui (I18n)
.PHONY: extract
extract: $(SRC)  ## I18n: Extract message catalogs
	@echo "${INFO}I18n: Extracting message catalogs"
	$(NPM) run extract
	@echo "${OK}"

# extract message catalogs for lingui (I18n)
.PHONY: extract-clean
extract-clean: $(SRC)  ## I18n: Extract message catalogs & remove unused messages
	@echo "${INFO}I18n: Extracting message catalogs & removing unused messages"
	$(NPM) run extract-clean
	@echo "${OK}"

# compile messages catalogs for lingui (I18n)
.PHONY: compile
compile: src/locale/en/messages.po  ## I18n: Compile message catalogs
	@echo "${INFO}I18n: Compiling message catalogs"
	$(NPM) run compile
	@echo "${OK}"
