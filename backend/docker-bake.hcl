variable "MAINTAINER" {}

variable "DETEKT_VER" {}
variable "DETEKT_SHA" {}
variable "FSB_VER" {}
variable "FSB_PATCH" {}
variable "OWASP_DC" {}
variable "OWASP_DC_SHA" {}

variable "ENGINE_BASE" {}

variable "ENGINE_TAG" {}
variable "JAVA8_TAG" {}
variable "JAVA11_TAG" {}
variable "JAVA17_TAG" {}
variable "JAVA21_TAG" {}

variable "ECR_URL" {}
variable "LATEST_COMMIT" {}

group "java" {
  targets = [
    "java8",
    "java11",
    "java17",
    "java21",
  ]
}

# Expand the full list of tags.
function "full_tags" {
  params = [base_tag]
  result = [
    base_tag,
    "${ECR_URL}${base_tag}",
    "${ECR_URL}${base_tag}-stage-${LATEST_COMMIT}",
  ]
}

target "boxed-glibc" {
  dockerfile = "Dockerfiles/Dockerfile.boxed"

  args = {
    PYTHON_VER = "3.12-bookworm"
    LIBC = "glibc"
  }
}

target "boxed-musl" {
  dockerfile = "Dockerfiles/Dockerfile.boxed"

  args = {
    # For Musl, temporarily use Python 3.13 to fix issues with
    # ModuleNotFoundError at runtime:
    # https://github.com/python/cpython/issues/95855
    #
    # Plugin authors choosing to use Musl-based distributions (e.g. Alpine)
    # in their containers must check for compatibility.
    #
    # This can be reverted if the linked issue is backported to 3.12.
    PYTHON_VER = "3.13-alpine"
    PYTHON_TARGET_VER = "3.13"
    LIBC = "musl"
  }
}

target "engine" {
  dockerfile = "Dockerfiles/Dockerfile.engine"
  tags = full_tags(ENGINE_TAG)
  platforms = ["linux/amd64"]

  contexts = {
    boxed-glibc = "target:boxed-glibc"
    boxed-musl = "target:boxed-musl"
  }

  args = {
    MAINTAINER = MAINTAINER
    ENGINE_BASE = ENGINE_BASE
  }
}

# Standard build args for all Java targets.
java_args = {
  MAINTAINER = MAINTAINER
  DETEKT_VER = DETEKT_VER
  DETEKT_SHA = DETEKT_SHA
  FSB_VER = FSB_VER
  FSB_PATCH = FSB_PATCH
}

target "java8" {
  dockerfile = "Dockerfiles/Dockerfile.java"
  tags = full_tags(JAVA8_TAG)
  no-cache = true

  args = merge(java_args, {
    OPENJDK_VER = "8-jdk-alpine-3.21"
  })
}

target "java11" {
  dockerfile = "Dockerfiles/Dockerfile.java"
  tags = full_tags(JAVA11_TAG)
  no-cache = true

  secret = [
    "type=env,id=NVD_API_KEY,env=NVD_API_KEY"
  ]

  args = merge(java_args, {
    OPENJDK_VER = "11-jdk-alpine-3.21"
    # OWASP Dependency Check enabled for Java 11 only.
    OWASP_DC = OWASP_DC
    OWASP_DC_SHA = OWASP_DC_SHA
  })
}

target "java17" {
  dockerfile = "Dockerfiles/Dockerfile.java"
  tags = full_tags(JAVA17_TAG)
  no-cache = true

  args = merge(java_args, {
    OPENJDK_VER = "17-jdk-alpine-3.21"
  })
}

target "java21" {
  dockerfile = "Dockerfiles/Dockerfile.java"
  tags = full_tags(JAVA21_TAG)
  no-cache = true

  args = merge(java_args, {
    OPENJDK_VER = "21-jdk-alpine-3.21"
  })
}
