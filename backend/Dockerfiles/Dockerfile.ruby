# Build stage with dev tools
FROM dhi.io/ruby:3.3-debian13-dev AS builder

ARG BRAKEMAN_VER=6.2.2
ARG BUNDLER_VER=0.9.2

# Run all additional config in a single RUN to reduce the layers:
# - Install git as a dependency of bundler-audit.
# - Install brakeman and bundler-audit
# - Remove unused packages and bundler-audit rspec Gemfiles to avoid
#   false-positives in scans.
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends git && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    gem install brakeman --version ${BRAKEMAN_VER} && \
    gem install bundler-audit --version ${BUNDLER_VER} && \
    rm -rf /usr/local/bundle/gems/bundler-audit-${BUNDLER_VER}/spec/

# Final runtime stage
FROM dhi.io/ruby:3.3-debian13

ARG MAINTAINER
LABEL maintainer=$MAINTAINER

# Copy installed gems from builder
COPY --from=builder /usr/local/bundle /usr/local/bundle

# Copy git binary and libraries from builder
COPY --from=builder /usr/bin/git* /usr/bin/
COPY --from=builder /usr/lib /usr/lib
COPY --from=builder /usr/share/git-core /usr/share/git-core

# Add a shell and dirname - /bin/sh
# /bin/sh in the builder image is a symlink to bash. We don't need the symlink, so we copy it directly instead.
# Note: Since this is a stripped image, any missing builtin shell commands used in plugins.sh (grep, etc.) should be copied here as well
COPY --from=builder /usr/bin/bash /bin/sh
COPY --from=builder /usr/bin/dirname /usr/bin/dirname
