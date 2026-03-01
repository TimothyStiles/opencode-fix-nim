# opencode-fix-nim

A small local proxy that fixes NVIDIA NIM API tool call compatibility with OpenCode by adding missing `id` fields.

## The Problem

NVIDIA NIM returns tool calls without required `id` fields, causing OpenCode tool use to fail. This proxy intercepts responses and injects unique IDs for each tool call.

## Install

```bash
npm install -g opencode-fix-nim
```

This modifies your `~/.config/opencode/opencode.json` to route NVIDIA requests through the proxy. A backup is created automatically.

## Usage

```bash
opencode
```

The proxy runs on `localhost:9876` and patches tool responses automatically.

## Revert

```bash
# Find and restore from backup
ls ~/.config/opencode/opencode.json.backup-*
cp ~/.config/opencode/opencode.json.backup-<timestamp> ~/.config/opencode/opencode.json
```

Or manually edit `~/.config/opencode/opencode.json` and change the NVIDIA `baseURL` back to `https://integrate.api.nvidia.com/v1`. Revert instructions are in the `_comment` field of the JSON.

## License

MIT
