FROM cgr.dev/chainguard/ruby:latest-dev

ARG MAINTAINER
LABEL maintainer=$MAINTAINER

ARG BRAKEMAN_VER=6.2.2
ARG BUNDLER_VER=0.9.2

USER root

# Run all additional config in a single RUN to reduce the layers:
# - Install brakeman and bundler-audit
# - Remove bundler-audit rspec Gemfiles to avoid false-positives in scans.
# hadolint ignore=DL3008
RUN gem install brakeman --version ${BRAKEMAN_VER} && \
    gem install bundler-audit --version ${BUNDLER_VER} && \
    rm -rf /usr/lib/ruby/gems/3.3.0/gems/bundler-audit-${BUNDLER_VER}/spec/

USER nonroot
ENTRYPOINT ["/bin/sh"]
