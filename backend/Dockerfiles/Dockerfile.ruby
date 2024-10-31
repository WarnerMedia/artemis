ARG RUBY_VER=3.0-slim-bullseye
FROM ruby:${RUBY_VER}

ARG MAINTAINER
LABEL maintainer=$MAINTAINER

ARG BRAKEMAN_VER=5.0.0
ARG BUNDLER_VER=0.8.0

# Run all additional config in a single RUN to reduce the layers:
# - Install brakeman and bundler-audit
# - Install git as a dependency of bundler-audit.
# - Remove bundler-audit rspec Gemfiles to avoid false-positives in scans.
# hadolint ignore=DL3008
RUN apt-get update && \
    grep security /etc/apt/sources.list > /etc/apt/security.sources.list && \
    apt-get upgrade -y && \
    apt-get upgrade -y -o Dir::Etc::Sourcelist=/etc/apt/security.sources.list && \
    apt-get install -y --no-install-recommends git && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    gem install brakeman --version ${BRAKEMAN_VER} && \
    gem install bundler-audit --version ${BUNDLER_VER} && \
    rm -rf /usr/local/bundle/gems/bundler-audit-${BUNDLER_VER}/spec/
