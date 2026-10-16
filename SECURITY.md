# Security policy

Security fixes target the latest published release and `main`. Older versions
do not have a separate support branch.

Use [GitHub private vulnerability reporting](https://github.com/agamal026/raydium-cpmm-arb-monitor/security/advisories/new)
for suspected vulnerabilities. Include the affected version, expected and
observed behavior, and a minimal reproduction using synthetic data. Do not
include real credentials, wallet keys, private RPC URLs, or private customer
data. Avoid public disclosure of sensitive details while a report is being
assessed.

Reports are handled on a best-effort basis; no response deadline or bounty is
promised. Public bug reports that do not expose sensitive security details can
use GitHub issues.

The tool does not trade, sign transactions, or require wallet credentials.
Its API responses and logs can contain untrusted data. Review logs before
sharing them: the current URL redaction covers only a few query names and is
not a general credential sanitizer.
