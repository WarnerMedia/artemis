#!/bin/bash

APP=$1
export AWS_DEFAULT_REGION=$2

# Find all engine instances
# shellcheck disable=SC2016
aws autoscaling describe-auto-scaling-instances \
  --output text \
  --query "AutoScalingInstances[?(AutoScalingGroupName==\`$APP-engine-asg-nat\` || AutoScalingGroupName==\`$APP-engine-asg-public\`)].[InstanceId]" |
  while read -r instance_id; do
    # Get name of instance id
    name=$(
      aws ec2 describe-tags \
        --output text \
        --filters "Name=resource-id,Values=${instance_id}" \
        --query 'Tags[?Key==`Name`].Value'
    )

    # Update name of old engine instances to make them easier to identify in the AWS console
    aws ec2 create-tags \
      --resources "${instance_id}" \
      --tags Key=Name,Value="${name} OLD"

    # Set health of old engine instances to Unhealthy so that they are replaced
    aws autoscaling set-instance-health \
      --health-status Unhealthy \
      --instance-id "${instance_id}"
  done
