FROM swift:5.5.2-focal

ARG MAINTAINER
LABEL maintainer=$MAINTAINER

ARG SWIFTLINT_VER

# Dependencies
RUN apt-get update
RUN apt-get -y install curl busybox python3-pip

# Engine requires python3 and boto3 module be installed
RUN ln -sf /usr/bin/python3 /usr/bin/python
RUN pip3 install -U pip
RUN pip3 install -U boto3

# Install swiftlint
RUN curl -sL "https://github.com/realm/SwiftLint/releases/download/${SWIFTLINT_VER}/swiftlint_linux.zip" | busybox unzip - swiftlint -d /usr/local/bin/
RUN chmod a+x /usr/local/bin/swiftlint
COPY ./engine/plugins/swiftlint/swiftlint.yml /etc/swiftlint.yml
