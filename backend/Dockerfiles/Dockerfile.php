FROM php:8.4-bookworm

ARG MAINTAINER
LABEL maintainer=$MAINTAINER

ARG PHP_SCANNER_VER

# Run all additional config in a single RUN to reduce the layers:
# - Base apk requirements to execute script
# - Upgrade pip and install boto3 for plugin utils
# - Symlink python3 to python for Analyzer Engine benefit
# - Setup directory for scanner binary to sit
# - Download and Install Composer
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends git wget && \
    rm -rf /var/lib/apt/lists/* && \
    curl https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer


# Download the Psalm PHAR and place it in /usr/local/bin
RUN wget https://github.com/vimeo/psalm/releases/download/${PHP_SCANNER_VER}/psalm.phar -O /usr/local/bin/psalm && \
    chmod +x /usr/local/bin/psalm 
