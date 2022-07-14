# ASG scale down event handler

This Lambda is triggered on the autoscaling group scale down event and flags the engines being terminated so that they will gracefully shut down and stop processing scans.
