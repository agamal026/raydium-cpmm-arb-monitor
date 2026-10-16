# Contributing

This project is a read-only pool monitor maintained by
[@agamal026](https://github.com/agamal026). Useful contributions include
reproducible parsing bugs, price-normalization corrections, polling reliability,
tests, and clearer documentation.

For a bug, open a GitHub issue with the version or commit, Node version, OS,
expected behavior, and a small reproducible example. Remove credentials and
private endpoints from logs and fixtures. Use [SECURITY.md](SECURITY.md) for
security reports.

Discuss large behavior changes before implementation. Keep a pull request
focused and include a regression test that fails before the fix when practical.
Tests must run offline with synthetic fixtures or a loopback server. Do not
require a wallet, paid endpoint, or a live trade.

```sh
npm ci
npm test
```

CI checks Node.js 22 and 24 on Linux and Windows. Explain which checks you ran
and any limitations. Disclose material AI assistance in the pull request;
contributors remain responsible for understanding the submitted change.

Contributions are under the repository's MIT license. Preserve third-party
notices when including material from elsewhere. Issue handling and reviews are
best effort; there is no promised response time.
