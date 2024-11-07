ARG RUBY_VER=3.3-slim-bookworm
FROM ruby:${RUBY_VER}

ARG MAINTAINER
LABEL maintainer=$MAINTAINER

ARG BRAKEMAN_VER=6.2.2
ARG BUNDLER_VER=0.9.2

# Run all additional config in a single RUN to reduce the layers:
# - Install brakeman and bundler-audit
# - Install git as a dependency of bundler-audit.
# - Remove unused packages and bundler-audit rspec Gemfiles to avoid
#   false-positives in scans.
# hadolint ignore=DL3008
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends git && \
    gem install brakeman --version ${BRAKEMAN_VER} && \
    gem install bundler-audit --version ${BUNDLER_VER} && \
    rm -rf /usr/local/bundle/gems/bundler-audit-${BUNDLER_VER}/spec/ && \
    apt-get remove -y linux-libc-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
