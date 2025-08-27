# syntax=docker/dockerfile:1

FROM golang:1.24 AS builder

WORKDIR /src/app

COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
	--mount=type=cache,target=/root/.cache/go-build \
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o run-plugin .

# Distroless always uses the "latest" tag.
# hadolint ignore=DL3007
FROM gcr.io/distroless/static-debian12:latest

WORKDIR /opt/artemis-plugin-toolbox/bin

# Install a statically-compiled BusyBox in the specific location.
COPY --from=busybox:1.37.0-musl /bin/busybox .
RUN ["./busybox", "--install", "."]

# Install statically-compiled plugin wrapper.
COPY --from=builder /src/app/run-plugin .

# The container provides the volume; we don't need to run anything.
VOLUME ["/opt/artemis-plugin-toolbox/bin"]
ENTRYPOINT ["/opt/artemis-plugin-toolbox/bin/true"]
