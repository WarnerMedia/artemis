# syntax=docker/dockerfile:1

FROM alpine:3.20 AS common

# We're using Alpine's /bin/sh, so disable pipefail suggestion.
# hadolint global ignore=DL4006

ARG SWIFTLINT_VER
ARG SWIFTLINT_SHA

RUN wget -q -O /tmp/swiftlint.zip "https://github.com/realm/SwiftLint/releases/download/${SWIFTLINT_VER}/swiftlint_linux.zip" && \
    echo "$SWIFTLINT_SHA  /tmp/swiftlint.zip" | sha256sum -c - && \
    unzip /tmp/swiftlint.zip -d /opt/swiftlint && \
    chmod a+x /opt/swiftlint/swiftlint


FROM swift:5.5.2-focal

ARG MAINTAINER
LABEL maintainer=$MAINTAINER

# Install swiftlint
COPY --from=common /opt/swiftlint/ /opt/swiftlint/
COPY ./engine/plugins/swiftlint/swiftlint.yml /etc/swiftlint.yml

ENV PATH=/opt/swiftlint:$PATH
