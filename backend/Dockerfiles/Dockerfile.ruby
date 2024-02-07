ARG RUBY_VER=3.0-alpine
FROM ruby:${RUBY_VER}

ARG MAINTAINER
LABEL maintainer=$MAINTAINER

# Set the version for bundler audit
ARG BUNDLER_VER=0.8.0

# Run all additional config in a single RUN to reduce the layers:
# - Apply security updates
# - Base apk requirements to execute script
# - Upgrade pip and install boto3 for plugin utils
# - Symlink python3 to python for Analyzer Engine benefit
# - Install brakeman and bundler-audit
# - Update webrick to resolve CVE-2020-25613. We can't actually uninstall webrick:1.6.0 because it's a default gem so
#   we'll still have to create an exception for this CVE. But with webrick:1.6.1 installed as a default gem it should
#   prevent it from being accidentally used (especially because webrick isn't used at all by Artemis plugins).
# - Remove bundler-audit rspec Gemfiles so that Aqua doesn't generate F+ from them when scanned
RUN apk update && \
    apk upgrade libcrypto1.1 libssl1.1 libretls && \
    apk add git unzip python3 py3-pip jq py3-boto3 && \
    ln -sf /usr/bin/python3 /usr/bin/python && \
    pip install --upgrade setuptools && \
    gem install brakeman --version 5.0.0 && \
    gem install bundler-audit --version ${BUNDLER_VER} && \
    rm -rf /usr/local/bundle/gems/bundler-audit-${BUNDLER_VER}/spec/
