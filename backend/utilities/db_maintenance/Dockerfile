###############################################################################
# Build stage
###############################################################################
FROM dhi.io/python:3.13-debian13-dev AS builder

WORKDIR /src

# Disable this warning
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

# Set the $PATH so that the venv takes precedent
ENV PATH="/venv/bin:$PATH"

# Create the venv
RUN python -m venv /venv

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl gnupg && \
    mkdir -p /usr/share/keyrings && \
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor > /usr/share/keyrings/postgresql-archive-keyring.gpg && \
    chmod a+r /usr/share/keyrings/postgresql-archive-keyring.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/postgresql-archive-keyring.gpg] http://apt.postgresql.org/pub/repos/apt trixie-pgdg main" > /etc/apt/sources.list.d/pgdg.list

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
FROM dhi.io/python:3.13-debian13-dev AS app

ARG MAINTAINER
LABEL maintainer=$MAINTAINER

WORKDIR /app

# Set the $PATH so that the virtualenv takes precedent
ENV PATH="/venv/bin:$PATH"

# Copy the venv, which contains the app and all dependencies, from the builder
COPY --from=builder /venv /venv

COPY --from=builder /etc/apt /etc/apt
COPY --from=builder /usr/share/keyrings /usr/share/keyrings

# Run all additional config in a single RUN to reduce the layers:
# - Apply security updates
# - Install PostgreSQL client
# hadolint ignore=DL3008
RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install postgresql-client-12 -y --no-install-recommends \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

CMD ["tail", "-f", "/dev/null"]
