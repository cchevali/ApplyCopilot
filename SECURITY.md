# Security Notes

## Next.js Patch Policy
ApplyCopilot pins Next.js to a patched 14.x release to address known React Server Components (RSC) security vulnerabilities. React’s RSC security guidance and the Next.js security update blog both recommend upgrading to the latest patched 14.x release rather than staying on older 14.2.x builds.

Current pin: `next@14.2.35` and matching `eslint-config-next@14.2.35`. We update intentionally when new security releases land.
