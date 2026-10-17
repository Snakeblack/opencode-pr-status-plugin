# Glossary

| Term | Meaning |
| --- | --- |
| Pull request (PR) | A proposed change to a repository on the remote platform, with reviews and automated checks. |
| Stack (chained PR) | A series of PRs each targeting the previous PR's branch; CI state of one depends on the chain. |
| Check / CI status | The result of the platform's automated runs for a PR: running, passed (green) or failed (red); the panel shows an aggregate per PR. |
| Panel | The plugin's UI surface in the host TUI sidebar: the PR/CI list. |
| Local client | The user-installed, authenticated command-line tool the plugin invokes for every remote read; the concrete tool lives in the technology record. |
| Host | The terminal UI application the plugin runs inside (OpenCode V2); it owns configuration, lifecycle and any durable storage. |
| Untrusted text | Strings whose content can be influenced by other accounts (titles, branch names, logins) and must be escaped at the render boundary (ADR 0003). |
