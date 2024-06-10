#!/bin/bash

set -euo pipefail

# Variables inherited from terraform
# ShellCheck will throw a warning if these are not exported
export "aqua_enabled"
export "aws_region"
export "docker_compose_ver"
export "engine_block_device"
export "github_app_id"
export "plugin_java_heap_size"
export "private_docker_repos_key"
export "s3_bucket"
export "s3_bucket"
export "status_lambda"
export "type"
export "ver"
export "veracode_enabled"
export "snyk_enabled"
export "ghas_enabled"
export "revproxy_domain_substring"

# Format and mount data volume
mkfs -t ext4 "${engine_block_device}"
mkdir -p /data
mount "${engine_block_device}" /data
chmod 755 /data

# Make sure packages are up-to-date
yum -y update

# Install dependencies
yum -y install jq
amazon-linux-extras install -y docker=20.10.25

# Allow ec2-user to use docker
usermod -a -G docker ec2-user

# Create daemon.json if it does not exist
mkdir -p /data/docker
if [[ ! -f "/etc/docker/daemon.json" ]]; then
  echo '{}' >"/etc/docker/daemon.json"
fi

# Change docker config to put data in /data/docker
# We need printf to buffer the output of jq before redirecting to a file, otherwise the file will end up blank
printf "%s" "$(jq -r '."data-root" = "/data/docker"' <'/etc/docker/daemon.json')" >/etc/docker/daemon.json

# Set docker to start on boot
systemctl enable docker

# Start docker daemon now
systemctl start docker

# Install docker-compose
curl -sL -o /usr/local/bin/docker-compose "https://github.com/docker/compose/releases/download/v${docker_compose_ver}/docker-compose-$(uname -s)-$(uname -m)"
chmod +x /usr/local/bin/docker-compose

# Pull down bootstrap scripts
# shellcheck disable=2034
zip_dir=$(mktemp -d)
aws s3 cp "s3://${s3_bucket}/scripts/v${ver}/engine_scripts.zip" "/$${zip_dir}/engine_scripts.zip"
unzip -o "/$${zip_dir}/engine_scripts.zip" -d /home/ec2-user
rm -rf "$${zip_dir}"

# Populate .env file
/home/ec2-user/aws_env.py "${type}" "${application}" >/home/ec2-user/.env
cat >>/home/ec2-user/.env <<EOF
ARTEMIS_FEATURE_AQUA_ENABLED=${aqua_enabled}
ARTEMIS_FEATURE_VERACODE_ENABLED=${veracode_enabled}
ARTEMIS_FEATURE_SNYK_ENABLED=${snyk_enabled}
ARTEMIS_FEATURE_GHAS_ENABLED=${ghas_enabled}
ARTEMIS_GITHUB_APP_ID=${github_app_id}
ARTEMIS_PLUGIN_JAVA_HEAP_SIZE=${plugin_java_heap_size}
ARTEMIS_PRIVATE_DOCKER_REPOS_KEY=${private_docker_repos_key}
ARTEMIS_STATUS_LAMBDA=${status_lambda}
S3_BUCKET=${s3_bucket}
APPLICATION=${application}
REGION=${region}
ARTEMIS_DOMAIN_NAME=${domain_name}
ARTEMIS_MANDATORY_INCLUDE_PATHS=${mandatory_include_paths}
ARTEMIS_METADATA_SCHEME_MODULES=${metadata_scheme_modules}
ARTEMIS_REVPROXY_DOMAIN_SUBSTRING=${revproxy_domain_substring}
ARTEMIS_REVPROXY_SECRET=${revproxy_secret}
ARTEMIS_REVPROXY_SECRET_REGION=${revproxy_secret_region}
ARTEMIS_SECRETS_EVENTS_ENABLED=${secrets_events_enabled}
ARTEMIS_INVENTORY_EVENTS_ENABLED=${inventory_events_enabled}
ARTEMIS_CONFIGURATION_EVENTS_ENABLED=${configuration_events_enabled}
ARTEMIS_VULNERABILITY_EVENTS_ENABLED=${vulnerability_events_enabled}
ARTEMIS_METADATA_EVENTS_ENABLED=${metadata_events_enabled}
ARTEMIS_LOG_LEVEL=${log_level}
EOF

# Fix ownership of files for ec2-user
chown -R ec2-user:ec2-user /home/ec2-user

# Log into ECR and save credentials as ec2-user
sudo --login --set-home --user=ec2-user <<<"$(aws ecr get-login --no-include-email --region="${aws_region}")"

# Start the engine as ec2-user
sudo --login --set-home --user=ec2-user <<<'/usr/local/bin/docker-compose -f docker-compose.aws.yml -p artemis up -d'
