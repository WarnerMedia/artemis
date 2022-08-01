# Heimdall

Artemis Scan Orchestrator

>Heimdall is attested as possessing foreknowledge, keen eyesight and hearing, and keeps watch for invaders and the onset of Ragnarök while drinking fine mead in his dwelling Himinbjörg, located where the burning rainbow bridge Bifröst meets the sky. [Wikipedia](https://en.wikipedia.org/wiki/Heimdallr)

Heimdall is a tool for initiating Artemis scans across a large set of services, repositories, and branches at once. At its broadest, it can be configured to initate a full Artemis scan of every branch of every repository in every service that Artemis supports on a recurring schedule. Multiple different scans can be configured to run on different schedules, each with a different scan configuration, such as limiting the set of plugins run to target just secrets detection or just scanning a particualar service and organization or just scanning the primary branch of every repository. Additionally, Heimdall has a REST API for initiating scans in an ad-hoc manner. Artemis scans initiated by Heimdall receive lower priority by Artemis and are always processed after any scans initiated via the UI or CI integrations.

## 🚢  Initial Deployment

1. Create a new environment in `terraform/environments`, copying the example and modifing as needed.
2. Create S3 buckets and ECR repositories: `terraform -chdir=terraform/environments/ENV apply -target module.heimdall.aws_s3_bucket.heimdall_files`
3. Copy `example.mk` to a new `.mk` file that matches the name of the environment created in step 1. The `Makefile` expects `nonprod.mk` to exist by default but can be overridden by setting the `ENV` var to a different value when running make (`make ENV=name`).
4. Build, upload, and stage artifacts: `make upload_lambdas`
5. Deploy the rest of the Terraform: `terraform -chdir=terraform/environments/ENV apply`
6. Create an Artemis API key and store it in Secrets Manager
