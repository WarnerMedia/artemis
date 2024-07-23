ARG OPENJDK_VER=7u201-jdk-alpine3.9
FROM openjdk:$OPENJDK_VER

ARG MAINTAINER
LABEL maintainer=$MAINTAINER

ARG DETEKT_VER
ARG DETEKT_SHA
ARG FSB_PATCH=""
ARG FSB_VER=1.9.0
ARG OWASP_DC=""
ARG OWASP_DC_SHA
ENV FSB_VER=$FSB_VER
ENV FSB_PATCH=$FSB_PATCH
ENV OWASP_DC=$OWASP_DC

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
RUN pip3 install --no-cache-dir --upgrade pip setuptools && \
    pip3 install --no-cache-dir boto3 && \
    ln -s /usr/bin/python3 /usr/bin/python

WORKDIR /app
RUN wget https://github.com/find-sec-bugs/find-sec-bugs/releases/download/version-$FSB_VER/findsecbugs-cli-$FSB_VER$FSB_PATCH.zip
RUN unzip findsecbugs-cli-$FSB_VER$FSB_PATCH.zip -d /app/findsecbugs

# OWASP Dependency Check only runs with certain Java versions so only include
# if the variable is set, which will happen for those Java versions. After
# downloading, update dependency check data so it doesn't have to all be
# downloaded each scan
RUN if [ "$OWASP_DC" != "" ] ; then \
    echo "$OWASP_DC_SHA  dependency-check-$OWASP_DC-release.zip" > owasp_checksum.txt && \
    wget https://github.com/jeremylong/DependencyCheck/releases/download/v$OWASP_DC/dependency-check-$OWASP_DC-release.zip && \
    sha256sum -c owasp_checksum.txt && \
    unzip dependency-check-$OWASP_DC-release.zip -d /app/owasp_dependency-check && \
    /app/owasp_dependency-check/dependency-check/bin/dependency-check.sh --connectiontimeout 120000 --updateonly ; \
    fi

WORKDIR /app/findsecbugs

RUN sed -i -e 's/\r$//' findsecbugs.sh
RUN chmod a+x findsecbugs.sh

# Install detekt
RUN wget -q -O /usr/local/bin/detekt.jar \
        "https://github.com/detekt/detekt/releases/download/v${DETEKT_VER}/detekt-cli-${DETEKT_VER}-all.jar" && \
    echo "$DETEKT_SHA  /usr/local/bin/detekt.jar" | sha256sum -c -
## The detekt wrapper script is renamed from detekt.sh to "detekt"
## This is for compatability with installations done via a package manager
COPY ./engine/plugins/detekt/detekt.sh /usr/local/bin/detekt
RUN chmod a+x /usr/local/bin/detekt
