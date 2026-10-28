# Security policy

Klyro's entire premise is that your files stay on your machine. A bug that breaks that is the most serious kind this project can have, and it will be treated that way.

## Reporting a vulnerability

**Please do not open a public issue.**

Use GitHub's private vulnerability reporting: go to the [Security tab](https://github.com/Prakharpan-dey/Klyro/security) and choose **Report a vulnerability**. That opens a private thread with the maintainers and needs no email address from either side.

A useful report says what you did, what happened, and which browser and version. A proof of concept helps, but please never attach a real document — a file you generated for the purpose is always enough.

You should get a first reply within a few days. If a fix is needed, the advisory is published once it ships, and you will be credited unless you would rather not be.

## What counts as a vulnerability here

Anything that lets file contents leave the browser, or that weakens the barriers stopping it:

- A request carrying file bytes, or a way to make one — including through a dependency, a worker, a WASM module or a blob URL.
- A bypass of the Content-Security-Policy in `customHttp.yml`, particularly `connect-src`, `script-src` or `worker-src`.
- Any request leaving the site at all. The site has no backend, and `connect-src` allows only itself, so a request to another origin is a finding even if it carries no file data.
- Data surviving a tool that claims to remove it — for example a value still findable in the bytes after Privacy Check or Photo Privacy reports it gone.
- Stored state that outlives the tab when the app says nothing is stored.

## What does not count

- **A tool producing a poor-quality result.** That is a bug, not a vulnerability — please open a normal issue.
- **Output that a third-party reader opens differently.** Also a normal issue.
- **Findings from an automated scanner with no working proof of concept.**

## Scope

This policy covers the code in this repository. The hosted demo runs the same code; if a problem is specific to the deployment rather than the source, say so in the report.
