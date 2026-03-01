# OpenCode NIM Proxy

[![npm version](https://badge.fury.io/js/opencode-nim-fix.svg)](https://www.npmjs.com/package/opencode-nim-fix)

Seamless OpenCode plugin that provides a local proxy for NVIDIA NIM API endpoints with automatic configuration.

## Features

✅ **Automatic Installation** - No manual config editing required  
✅ **Tool Call Fixes** - Fixes NVIDIA NIM response formatting for OpenCode compatibility  
✅ **Local Proxy** - Runs on `http://localhost:9876/v1`  
✅ **Debug Endpoint** - Check logs at `/_debug`  
✅ **Safe Installation** - Creates backups, prompts for confirmation, shows clear warnings  

## Quick Install

```bash
# Install globally (recommended)
npm install -g opencode-nim-fix

# Or with bun
bun add -g opencode-nim-fix
```

The installer will:
1. Backup your current configuration
2. Warn you about the changes
3. Ask for confirmation
4. Automatically configure OpenCode to use the proxy

## Install Options

```bash
# Skip interactive prompt (CI mode)
CI=true npm install -g opencode-nim-fix

# Skip postinstall entirely
npm install -g opencode-nim-fix --ignore-scripts

# Then manually configure following postinstall guidance
```

## What Changes

The installer modifies `~/.config/opencode/opencode.json` to:

```json
{
  "provider": {
    "nvidia": {
      "_comment": "Added by opencode-nim-fix plugin | Original endpoint (for revert): https://integrate.api.nvidia.com/v1 | Current endpoint: http://localhost:9876/v1",
      "npm": "@ai-sdk/openai-compatible",
      "name": "NVIDIA NIM via Proxy",
      "options": {
        "baseURL": "http://localhost:9876/v1"
      }
    }
  }
}
```

## Usage

After installation, just run OpenCode normally:

```bash
opencode
```

The proxy starts automatically when OpenCode loads the plugin.

### Verify Everything Works

```bash
# Check proxy logs
curl http://localhost:9876/_debug

# Test with NVIDIA model
opencode --provider nvidia
```

## Debug Mode

Enable detailed logging:

```bash
# Show detailed proxy logs
NIM_PROXY_DEBUG=1 NIM_PROXY_DEBUG_MAX=20 opencode
```

## Reverting Changes

### Option 1: Restore from Backup

```bash
# Find and restore latest backup
ls ~/.config/opencode/opencode.json.backup-*
cp ~/.config/opencode/opencode.json.backup-<TIMESTAMP> ~/.config/opencode/opencode.json
```

### Option 2: Manual Edit

Edit `~/.config/opencode/opencode.json` and change `baseURL` back to:

```json
{
  "provider": {
    "nvidia": {
      "options": {
        "baseURL": "https://integrate.api.nvidia.com/v1"
      }
    }
  }
}
```

### Option 3: Reinstall

```bash
# Force reconfigure
npm install -g opencode-nim-fix --force
```

## Technical Details

### Automatic Installation

The npm package includes a postinstall script that:
- Creates a timestamped backup of your config
- Shows a clear warning banner with all changes
- Prompts for user confirmation
- Updates only the `baseURL` field, preserving other settings
- Adds a `_comment` field documenting the change for easy rollback

### What the Proxy Does

- **Patch missing IDs** - Adds required `id` fields to responses
- **Transform tool calls** - Converts inline tool calls to OpenAI format
- **Handle SSE** - Properly reconstructs chunked streaming responses
- **Debug endpoint** - Exposes `/_debug` for troubleshooting

### Requirements

- Bun >= 1.0.0
- OpenCode >= 0.x.x
- Port 9876 available on localhost

## Troubleshooting

### Port 9876 Already in Use

```bash
# Find what's using it
lsof -i :9876

# Then either:
# 1. Kill the process (kill -9 <PID>)
# 2. Or change the port (requires editing plugin source)
```

### Proxy Not Starting

```bash
# Check OpenCode logs
opencode --verbose

# Check proxy directly
curl http://localhost:9876/_debug
```

### Tools Still Not Working

1. Verify proxy is running: `curl http://localhost:9876/_debug`
2. Check config has correct `baseURL`
3. Ensure plugin loads in OpenCode
4. Enable debug mode: `NIM_PROXY_DEBUG=1 opencode`

## Development

```bash
# Clone and setup
git clone https://github.com/TimothyStiles/opencode-nim-fix
cd opencode-nim-fix
bun install

# Test postinstall (safe mode)
bun scripts/postinstall.ts

# Link for development
bun link
```

## License

MIT

## Contributing

Issues and PRs welcome!

## Support

- 🐛 Issues: https://github.com/TimothyStiles/opencode-nim-fix/issues
- 📚 Docs: https://github.com/TimothyStiles/opencode-nim-fix
- 🔧 Troubleshooting: Check `--verbose` output
