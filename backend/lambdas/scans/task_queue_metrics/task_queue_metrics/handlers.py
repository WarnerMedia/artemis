import os

import boto3

QUEUE_URLS_NAT = [
    os.environ["TASK_QUEUE_NAT"],
    os.environ["PRIORITY_TASK_QUEUE_NAT"],
]

QUEUE_URLS_PUBLIC = [
    os.environ["TASK_QUEUE"],
    os.environ["PRIORITY_TASK_QUEUE"],
]

ENGINE_ASG_PUBLIC_NAME = os.environ["ENGINE_ASG_PUBLIC"]
ENGINE_ASG_NAT_NAME = os.environ["ENGINE_ASG_NAT"]

ENGINES_PER_INSTANCE = 3

APPLICATION = os.environ.get("APPLICATION", "artemis")


class MetricHandler:
    def __init__(self):
        self.sqs = boto3.client("sqs")
        self.asg = boto3.client("autoscaling")
        self.cw = boto3.client("cloudwatch")

    def get_queue_size(self, queue_url):
        r = self.sqs.get_queue_attributes(QueueUrl=queue_url, AttributeNames=["ApproximateNumberOfMessages"])
        return int(r["Attributes"]["ApproximateNumberOfMessages"])

    def main(self, queue_urls, autoscaling_name):
        num_msg = 0
        for queue_url in queue_urls:
            num_msg += self.get_queue_size(queue_url)

        r = self.asg.describe_auto_scaling_groups(AutoScalingGroupNames=[autoscaling_name], MaxRecords=1)
        num_engines = int(r["AutoScalingGroups"][0]["DesiredCapacity"]) * ENGINES_PER_INSTANCE

        messages_per_engine = int(num_msg / num_engines) if num_engines > 0 else 0

        r = self.cw.put_metric_data(
            MetricData=[
                {
                    "MetricName": "queued_messages_per_engine",
                    "Dimensions": [{"Name": "QueueName", "Value": queue_urls[0].split("/")[-1]}],
                    "Unit": "Count",
                    "Value": messages_per_engine,
                },
            ],
            Namespace=APPLICATION,
        )

        print(r)


def handler(event, context):
    metric_handler = MetricHandler()
    metric_handler.main(QUEUE_URLS_PUBLIC, ENGINE_ASG_PUBLIC_NAME)
    metric_handler.main(QUEUE_URLS_NAT, ENGINE_ASG_NAT_NAME)
