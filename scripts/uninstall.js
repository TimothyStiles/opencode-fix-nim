#!/usr/bin/env node

import { join } from 'path'
import { homedir } from 'os'
import { existsSync } from 'fs'
import { readFile, writeFile } from 'fs/promises'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)

async function restoreConfig() {
  const configPath = join(homedir(), '.config', 'opencode', 'opencode.json')

  console.log('\n╔═══════════════════════════════════════════════════════════════╗')
  console.log('║  OpenCode NIM Proxy Plugin Uninstaller                        ║')
  console.log('╚═══════════════════════════════════════════════════════════════╝\n')

  if (!existsSync(configPath)) {
    console.log('OpenCode config not found. Nothing to uninstall.\n')
    return
  }

  try {
    const configContent = await readFile(configPath, 'utf-8')
    const config = JSON.parse(configContent)

    let modified = false

    // Remove only opencode-nim-fix from plugin array
    if (Array.isArray(config.plugin)) {
      const index = config.plugin.indexOf('opencode-nim-fix')
      if (index !== -1) {
        config.plugin.splice(index, 1)
        modified = true
        console.log('Removed opencode-nim-fix from plugin array')
      }
    }

    // Remove only the baseURL we set
    if (config.provider?.nvidia?.options?.baseURL === 'http://localhost:9876/v1') {
      delete config.provider.nvidia.options.baseURL

      // Clean up empty objects bottom-up, but only if empty
      if (Object.keys(config.provider.nvidia.options).length === 0) {
        delete config.provider.nvidia.options
      }
      if (Object.keys(config.provider.nvidia).length === 0) {
        delete config.provider.nvidia
      }
      if (Object.keys(config.provider).length === 0) {
        delete config.provider
      }

      modified = true
      console.log('Removed proxy baseURL from nvidia provider')
    }

    if (modified) {
      await writeFile(configPath, JSON.stringify(config, null, 2) + '\n')
      console.log('\nDone.\n')
    } else {
      console.log('No changes needed.\n')
    }

  } catch (error) {
    console.error('Failed to update configuration:', error)
    process.exit(1)
  }
}

if (process.argv[1] === __filename) {
  await restoreConfig().catch(error => {
    console.error('\nUninstallation failed:', error)
    process.exit(1)
  })
}

export default restoreConfig
