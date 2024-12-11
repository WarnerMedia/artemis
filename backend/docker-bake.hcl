variable "MAINTAINER" {}

variable "DETEKT_VER" {}
variable "DETEKT_SHA" {}
variable "FSB_VER" {}
variable "FSB_PATCH" {}
variable "OWASP_DC" {}
variable "OWASP_DC_SHA" {}

variable "ENGINE_BASE" {}

variable "ENGINE_TAG" {}
variable "JAVA7_TAG" {}
variable "JAVA8_TAG" {}
variable "JAVA13_TAG" {}
variable "JAVA17_TAG" {}

variable "ECR_URL" {}
variable "LATEST_COMMIT" {}

group "java" {
  targets = [
    "java7",
    "java8",
    "java13",
    "java17",
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
    PYTHON_VER = "3.9-bookworm"
  }
}

target "engine" {
  dockerfile = "Dockerfiles/Dockerfile.engine"
  tags = full_tags(ENGINE_TAG)

  contexts = {
    boxed-glibc = "target:boxed-glibc"
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

target "java7" {
  dockerfile = "Dockerfiles/Dockerfile.java"
  tags = full_tags(JAVA7_TAG)
  no-cache = true

  args = merge(java_args, {
    OPENJDK_VER = "7u201-jdk-alpine3.9"
  })
}

target "java8" {
  dockerfile = "Dockerfiles/Dockerfile.java"
  tags = full_tags(JAVA8_TAG)
  no-cache = true

  args = merge(java_args, {
    OPENJDK_VER = "8u201-jdk-alpine3.9"
    # OWASP Dependency Check enabled for Java 8 only.
    OWASP_DC = OWASP_DC
    OWASP_DC_SHA = OWASP_DC_SHA
  })
}

target "java13" {
  dockerfile = "Dockerfiles/Dockerfile.java"
  tags = full_tags(JAVA13_TAG)
  no-cache = true

  args = merge(java_args, {
    OPENJDK_VER = "13-ea-14-jdk-alpine3.9"
  })
}

target "java17" {
  dockerfile = "Dockerfiles/Dockerfile.java"
  tags = full_tags(JAVA17_TAG)
  no-cache = true

  args = merge(java_args, {
    OPENJDK_VER = "17-ea-14-jdk-alpine3.12"
  })
}
