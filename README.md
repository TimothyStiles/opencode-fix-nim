# OpenCode demo plugin

This repository contains a minimal OpenCode plugin intended for quick local verification.

What it does
- When OpenCode loads plugins from `.opencode/plugins/`, this plugin writes a file at
  `.opencode/demo-activated.txt` and logs a short message to the console.

Why this is easy to verify
- No build step (TypeScript runs directly under Bun).
- After starting OpenCode you can immediately check for the presence of
  `.opencode/demo-activated.txt` and view its contents.

Quick steps

1. Clone this repository (or copy its `.opencode` folder into your project root):

   git clone <repo-url>

2. Start OpenCode from the repository root (where the `.opencode` directory lives).

   - If you have a global `opencode` binary: `opencode`
   - If you use Bun and `bunx`: `bunx opencode`
   - If you use npm: `npx opencode`

3. Verify the plugin activated:

   - Check the activation file: `cat .opencode/demo-activated.txt`
   - You should also see a console line: `OpenCode demo plugin: wrote .opencode/demo-activated.txt`

Notes
- This demo is intentionally minimal to maximize compatibility with different OpenCode versions.
- If OpenCode requires a different plugin shape in your environment, this file will still show whether the loader attempted to run plugin code (via the written file).
