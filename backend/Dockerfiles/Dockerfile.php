# Build stage with dev tools
FROM dhi.io/composer:2.9-debian13-php8.4-dev AS builder

ARG PHP_SCANNER_VER

# Install dependencies for downloading tools
# `--fix-broken` step is added to fix a (probably temporary) regression in the base image. If
#   you're seeing this in the future, they may have fixed this, so feel free to remove that line
#   and try again
RUN apt-get update && \
    apt-get --fix-broken -y install && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /tmp

# Download Psalm
RUN curl -fsSL https://github.com/vimeo/psalm/releases/download/${PHP_SCANNER_VER}/psalm.phar -o /tmp/psalm && \
    chmod a+x /tmp/psalm

# Final runtime stage - clean image without dev packages
FROM dhi.io/composer:2.9-debian13-php8.4-dev

ARG MAINTAINER
LABEL maintainer=$MAINTAINER

# Copy tools from builder stage
COPY --from=builder /tmp/psalm /usr/local/bin/psalm

ENTRYPOINT [ "" ]
