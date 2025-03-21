FROM php:7.4.28-alpine3.14

ARG MAINTAINER
LABEL maintainer=$MAINTAINER

ARG PHP_SCANNER_VER

# Run all additional config in a single RUN to reduce the layers:
# - Base apk requirements to execute script
# - Upgrade pip and install boto3 for plugin utils
# - Symlink python3 to python for Analyzer Engine benefit
# - Setup directory for scanner binary to sit
# - Download and Install Composer
# - Download sensio tool (requires git and unzip)
RUN apk update && apk --update-cache add git unzip python3 py3-pip && \
    apk upgrade && \
    pip3 install --upgrade pip setuptools boto3 requests && \
    ln -s /usr/bin/python3 /usr/bin/python && \
    mkdir -p /app && \
    curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer && \
    curl -L https://github.com/fabpot/local-php-security-checker/releases/download/v${PHP_SCANNER_VER}/local-php-security-checker_${PHP_SCANNER_VER}_linux_amd64 --output /app/security-checker && \
    chmod a+x /app/security-checker