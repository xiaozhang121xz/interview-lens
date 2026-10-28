# Security Policy

## Supported version

Security fixes are applied to the latest revision of the main branch.

## Reporting a vulnerability

Please do not publish a suspected vulnerability in a public issue. Contact the repository maintainer privately and include:

- the affected route, component, or dependency;
- reproduction steps and expected impact;
- a minimal proof of concept, with secrets and personal data removed;
- any suggested mitigation.

Do not test against systems or data you do not own. The maintainers will acknowledge a valid report as soon as practical and coordinate disclosure after a fix is available.

## Secret handling

Never commit API keys, JWT secrets, database URLs containing credentials, customer interview data, exported databases, browser storage state, or private keys. If a secret is committed, revoke and rotate it immediately; deleting it from the latest commit is not sufficient.
