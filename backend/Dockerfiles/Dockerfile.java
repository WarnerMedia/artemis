# syntax=docker/dockerfile:1

ARG OPENJDK_VER=11-jdk-alpine-3.21

# Common tools included in all Java targets.
FROM alpine:3.20 AS common

# We're using Alpine's /bin/sh, so disable pipefail suggestion.
# hadolint global ignore=DL4006

ARG DETEKT_VER
ARG DETEKT_SHA
ARG FSB_VER
ARG FSB_PATCH

WORKDIR /app

# Install OWASP Find Security Bugs and fix up launcher script.
RUN wget -q -O /tmp/findsecbugs.zip "https://github.com/find-sec-bugs/find-sec-bugs/releases/download/version-$FSB_VER/findsecbugs-cli-$FSB_VER$FSB_PATCH.zip" && \
    unzip /tmp/findsecbugs.zip -d /app/findsecbugs && \
    sed -i -e 's/\r$//' /app/findsecbugs/findsecbugs.sh && \
    chmod a+x /app/findsecbugs/findsecbugs.sh && \
    rm /tmp/findsecbugs.zip

# Install detekt.
RUN wget -q -O /usr/local/bin/detekt.jar \
        "https://github.com/detekt/detekt/releases/download/v${DETEKT_VER}/detekt-cli-${DETEKT_VER}-all.jar" && \
    echo "$DETEKT_SHA  /usr/local/bin/detekt.jar" | sha256sum -c -
## The detekt wrapper script is renamed from detekt.sh to "detekt"
## This is for compatability with installations done via a package manager
COPY ./engine/plugins/detekt/detekt.sh /usr/local/bin/detekt
RUN chmod a+x /usr/local/bin/detekt


# Java-version-specific images.
FROM eclipse-temurin:$OPENJDK_VER AS dist

ARG OWASP_DC=""
ARG OWASP_DC_SHA=""

ARG MAINTAINER
LABEL maintainer=$MAINTAINER

# Base apk requirements to execute script
# hadolint ignore=DL3018
RUN apk --no-cache add \
        bash \
        curl \
        docker \
        git \
        maven \
        py3-pip \
        python3 \
        unzip

# Upgrade pip and install engine dependencies.
# hadolint ignore=DL3013
RUN pip3 install --no-cache-dir --break-system-packages --upgrade pip setuptools boto3 

WORKDIR /app

# OWASP Dependency Check only runs with certain Java versions so only include
# if the variable is set, which will happen for those Java versions. After
# downloading, update dependency check data so it doesn't have to all be
# downloaded each scan
RUN  --mount=type=secret,id=NVD_API_KEY,env=NVD_API_KEY if [ "$OWASP_DC" != "" ] ; then \
    wget -q -O /tmp/dependency-check.zip "https://github.com/jeremylong/DependencyCheck/releases/download/v$OWASP_DC/dependency-check-$OWASP_DC-release.zip" && \
    echo "$OWASP_DC_SHA  /tmp/dependency-check.zip" | sha256sum -c - && \
    unzip /tmp/dependency-check.zip -d /app/owasp_dependency-check && \
    rm /tmp/dependency-check.zip && \
    /app/owasp_dependency-check/dependency-check/bin/dependency-check.sh --nvdApiKey "$NVD_API_KEY" --connectiontimeout 120000 --updateonly ; \
    fi

COPY --from=common /app/findsecbugs/ /app/findsecbugs/
COPY --from=common /usr/local/bin/detekt* /usr/local/bin
