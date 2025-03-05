variable "MAINTAINER" {}

variable "DETEKT_VER" {}
variable "DETEKT_SHA" {}
variable "FSB_VER" {}
variable "FSB_PATCH" {}
variable "NVD_API_KEY" {}
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

  args = merge(java_args, {
    OPENJDK_VER = "11-jdk-alpine-3.21"
    # OWASP Dependency Check enabled for Java 11 only.
    OWASP_DC = OWASP_DC
    OWASP_DC_SHA = OWASP_DC_SHA
    NVD_API_KEY = NVD_API_KEY
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