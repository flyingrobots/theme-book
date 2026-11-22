# theme-book documentation

The documentation spine. Every durable page is routed from here.

Living references describe behavior that exists on `main`. They are kept current rather than
archived; git history is the archive.

| Page | Job |
| --- | --- |
| [Documentation standards](DOCUMENTATION_STANDARDS.md) | How pages in this corpus are written and maintained |
| [Contrast auditing](topics/contrast-auditing/README.md) | What `theme-book audit` checks, which standard to ask for, and how to read the result |
| [Contrast auditing test plan](topics/contrast-auditing/test-plan.md) | Requirements and evidence for the above |

## Elsewhere in the repository

| Location | Job |
| --- | --- |
| [`README.md`](../README.md) | Front door: what theme-book is, install, first look |
| [`CHANGELOG.md`](../CHANGELOG.md) | Release-visible history of the CLI and library |
| [`RELEASE.md`](../RELEASE.md) | Release runbook |
| [`AGENTS.md`](../AGENTS.md) | Working agreement: delivery loop, pull request flow, local gate |
| [`skills/theme-book/SKILL.md`](../skills/theme-book/SKILL.md) | The agent-facing skill |
| [`skills/theme-book/CHANGELOG.md`](../skills/theme-book/CHANGELOG.md) | History of the skill's guidance |

Do not create empty placeholder directories. Add a page when it has a real reader job.
