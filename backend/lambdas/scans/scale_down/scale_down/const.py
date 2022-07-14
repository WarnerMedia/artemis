from enum import Enum


class DetailType(Enum):
    TERMINATE_ACTION = "EC2 Instance-terminate Lifecycle Action"
    TERMINATE_SUCCESS = "EC2 Instance Terminate Successful"
    TERMINATE_UNSUCCESS = "EC2 Instance Terminate Unsuccessful"
