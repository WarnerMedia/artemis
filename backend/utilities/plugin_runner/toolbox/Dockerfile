# syntax=docker/dockerfile:1

# hadolint ignore=DL3007
FROM gcr.io/distroless/static-debian11:latest

WORKDIR /opt/artemis-plugin-toolbox/bin

# Install a statically-compiled BusyBox in the specific location.
COPY --from=busybox:1.37.0-musl /bin/busybox .
RUN ["./busybox", "--install", "."]

# The container provides the volume; we don't need to run anything.
VOLUME ["/opt/artemis-plugin-toolbox/bin"]
ENTRYPOINT ["/opt/artemis-plugin-toolbox/bin/true"]
