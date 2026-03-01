#!/usr/bin/env node

import { join, dirname } from 'path'
import { homedir } from 'os'
import { existsSync } from 'fs'
import { readFile, writeFile } from 'fs/promises'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)

async function updateConfig() {
  const configPath = join(homedir(), '.config', 'opencode', 'opencode.json')
  const backupPath = `${configPath}.backup-${Date.now()}`

  console.log('\n╔═══════════════════════════════════════════════════════════════╗')
  console.log('║  OpenCode NIM Proxy Plugin Installer                          ║')
  console.log('╚═══════════════════════════════════════════════════════════════╝\n')

  if (!existsSync(configPath)) {
    console.error('OpenCode config not found. Please run OpenCode first to initialize.')
    console.log('   Run: opencode --help\n')
    process.exit(1)
  }

  try {
    const configContent = await readFile(configPath, 'utf-8')
    const config = JSON.parse(configContent)

    const oldUrl = config.provider?.nvidia?.options?.baseURL

    if (oldUrl === 'http://localhost:9876/v1') {
      console.log('Already configured. No changes needed.\n')
      return
    }

    console.log('Creating backup...')
    await writeFile(backupPath, configContent)
    console.log(`Backup: ${backupPath}\n`)

    // Only touch baseURL - nothing else
    config.provider = config.provider || {}
    config.provider.nvidia = config.provider.nvidia || {}
    config.provider.nvidia.options = config.provider.nvidia.options || {}
    config.provider.nvidia.options.baseURL = 'http://localhost:9876/v1'

    // Add plugin entry only if not already present
    config.plugin = config.plugin || []
    if (!config.plugin.includes('opencode-nim-fix')) {
      config.plugin.push('opencode-nim-fix')
    }

    await writeFile(configPath, JSON.stringify(config, null, 2) + '\n')

    console.log(`baseURL: ${oldUrl || '(default)'} -> http://localhost:9876/v1`)
    console.log('Added opencode-nim-fix to plugin array')
    console.log('\nDone.\n')

  } catch (error) {
    console.error('Failed to update configuration:', error)
    process.exit(1)
  }
}

if (process.argv[1] === __filename) {
  await updateConfig().catch(error => {
    console.error('\nInstallation failed:', error)
    process.exit(1)
  })
}

export default updateConfig
