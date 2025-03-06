# Artemis: Hunt For Security Issues In Source Code

![Artemis](docs/images/logo192.png)

Artemis is an extensible source code scanning tool developed by the Warner Bros. Discovery Application Security team that provides a single interface for running multiple security analysis tools against a source code repository, regardless of the contents of the repository. Artemis can scan repositories in different GitHub, GitLab, Bitbucket, or Azure DevOps organizations from a single, unified platform.

## 📖 Contents

-   [Overview](#overview)
-   [License](#license)
-   [Contributors](docs/contributors.md)

## 🔨 Building

Artemis is made up of 3 primary components: the [backend](./backend), the [web UI](./ui), and the [scan orchestrator](./orchestrator). Each of these has its own components, architecture, and development processes, which are detailed in the README files within their subdirectories.

## 📁 Documents

[Artemis Overview](docs/overview.md)

[Why Shift-Left? Why Artemis?](docs/shiftleft.md)

[API Examples](docs/api-examples.md)

[CI Integration](docs/CI.md)

[GitHub Actions Integrations](docs/actions.md)

## 📌 Notice

This product uses data from the NVD API but is not endorsed or certified by the NVD.

## ©️ License

This repository is released under [the MIT license](https://en.wikipedia.org/wiki/MIT_License). View the [local license file](./LICENSE).
