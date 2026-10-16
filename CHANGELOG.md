# Changelog

## 0.1.1 — 2026-10-16

- Keep the HTTP timeout active while reading the response body for pool
  discovery and RPC health checks. Previously, receiving headers cleared the
  timer and a stalled body could block the request indefinitely.
- Add offline HTTP regression tests and CI for Node.js 22 and 24 on Linux and
  Windows.
- Update the locked development runner to tsx 4.23.15 and esbuild 0.28.2. This
  removes the old esbuild development-server advisory from the dependency
  audit; the monitor itself does not run an esbuild server.
- Document contributor workflow, supported runtimes, and private security
  reporting. The tool remains read-only.

## 0.1.0

Initial public monitor with pool discovery, price normalization, fee-adjusted
spread estimates, and CLI output.
