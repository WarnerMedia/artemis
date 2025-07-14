###############################################################################
# Build stage
###############################################################################
FROM python:12-bullseye AS builder

WORKDIR /src

# Disable this warning
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

# Set the $PATH so that the venv takes precedent
ENV PATH="/venv/bin:$PATH"

# Create the venv
RUN python -m venv /venv

RUN sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt bullseye-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
SHELL ["/bin/bash", "-o", "pipefail", "-c"]
RUN wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -

# Copy the source tree into the WORKDIR
COPY ./lambdas/api ./api
COPY ./libs ./libs
COPY ./utilities ./utilities

# Install the app and its dependencies using pip. Since the venv pip is used
# everything will be installed into the venv.
# hadolint ignore=DL3013
RUN pip install --no-cache-dir ./libs/artemislib ./libs/artemisdb ./api/repo

###############################################################################
# App stage
###############################################################################
FROM python:3.12-slim-bullseye AS app

ARG MAINTAINER
LABEL maintainer=$MAINTAINER

WORKDIR /app

# Set the $PATH so that the virtualenv takes precedent
ENV PATH="/venv/bin:$PATH"

# Copy the venv, which contains the app and all dependencies, from the builder
COPY --from=builder /venv /venv

COPY --from=builder /etc/apt /etc/apt

# Run all additional config in a single RUN to reduce the layers:
# - Apply security updates
# - Install PostgreSQL client
# hadolint ignore=DL3008
RUN apt-get update \
    && grep security /etc/apt/sources.list > /etc/apt/security.sources.list \
    && apt-get upgrade -y \
    && apt-get upgrade -y -o Dir::Etc::Sourcelist=/etc/apt/security.sources.list \
    && apt-get install postgresql-client-12 -y --no-install-recommends \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

CMD ["tail", "-f", "/dev/null"]
