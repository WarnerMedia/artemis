# syntax=docker/dockerfile:1

FROM dhi.io/alpine-base:3.22-dev AS common

# We're using Alpine's /bin/sh, so disable pipefail suggestion.
# hadolint global ignore=DL4006

ARG SWIFTLINT_VER
ARG SWIFTLINT_SHA

RUN apk add --no-cache curl ca-certificates && \
    curl -fsSL -o /tmp/swiftlint.zip "https://github.com/realm/SwiftLint/releases/download/${SWIFTLINT_VER}/swiftlint_linux.zip" && \
    echo "$SWIFTLINT_SHA  /tmp/swiftlint.zip" | sha256sum -c - && \
    unzip /tmp/swiftlint.zip -d /opt/swiftlint && \
    chmod a+x /opt/swiftlint/swiftlint && \
    apk del curl


FROM swift:5.5.2-focal

ARG MAINTAINER
LABEL maintainer=$MAINTAINER

# Install swiftlint
COPY --from=common /opt/swiftlint/ /opt/swiftlint/
COPY ./engine/plugins/swiftlint/swiftlint.yml /etc/swiftlint.yml

ENV PATH=/opt/swiftlint:$PATH
