#!/usr/bin/env node

import { join, dirname } from 'path'
import { homedir } from 'os'
import { existsSync } from 'fs'
import { readFile, writeFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function updateConfig() {
  const configPath = join(homedir(), '.config', 'opencode', 'opencode.json')
  const backupPath = `${configPath}.backup-${Date.now()}`
  
  console.log('\n╔═══════════════════════════════════════════════════════════════╗')
  console.log('║  OpenCode NIM Proxy Plugin Installer                          ║')
  console.log('╚═══════════════════════════════════════════════════════════════╝\n')
  
  console.log('⚠️  WARNING: This script will modify your OpenCode configuration  ')
  console.log('   to redirect NVIDIA NIM requests through a local proxy.        \n')
  
  console.log('Details:')
  console.log('  • Current endpoint: https://integrate.api.nvidia.com/v1       ')
  console.log('  • New endpoint:     http://localhost:9876/v1                  ')
  console.log('  • Location: ~/.config/opencode/opencode.json\n')
  
  console.log('This modification will:')
  console.log('  ✓ Enable tool calls with NVIDIA NIM models')
  console.log('  ✓ Proxy all NVIDIA requests through localhost:9876')
  console.log('  ✓ Start the proxy automatically when OpenCode runs\n')
  
  console.log('Requirements:')
  console.log('  • OpenCode must be running for this to work')
  console.log('  • Port 9876 must be available on your machine')
  console.log('  • The opencode-nim-fix plugin must be active\n')
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  if (!existsSync(configPath)) {
    console.error('❌ OpenCode config not found. Please run OpenCode first to initialize.')
    console.log('   Run: opencode --help\n')
    process.exit(1)
  }
  
  try {
    const configContent = await readFile(configPath, 'utf-8')
    const config = JSON.parse(configContent)
    
    const oldUrl = config.provider?.nvidia?.options?.baseURL
    const originalUrl = config.provider?.nvidia?.options?.baseURL || 'https://integrate.api.nvidia.com/v1'
    
    console.log('Current configuration:')
    console.log(`  baseURL: ${oldUrl || '(not set, using default)' }\n`)
    
    if (oldUrl === 'http://localhost:9876/v1') {
      console.log('✓ Already configured correctly. No changes needed.')
      console.log('  The proxy is already set up. Run: opencode\n')
      return
    }
    
    console.log('Changes to be made:')
    console.log(`  - From: ${originalUrl}`)
    console.log(`  - To:   http://localhost:9876/v1\n`)
    
    console.log('Additional fields will be added:')
    console.log(`  - provider.nvidia.npm: "@ai-sdk/openai-compatible"`)
    console.log(`  - provider.nvidia.name: "NVIDIA NIM via Proxy"`)
    console.log(`  - plugin: ["opencode-nim-fix"]\n`)
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    console.log('🔄 Proceeding with automatic installation...\n')
    
    console.log('Creating backup...')
    await writeFile(backupPath, configContent)
    console.log(`✓ Backup created: ${backupPath}\n`)
    
    console.log('Updating configuration...')
    
    config.provider = config.provider || {}
    config.provider.nvidia = config.provider.nvidia || {}
    
    config.provider.nvidia.options = config.provider.nvidia.options || {}
    config.provider.nvidia.options.baseURL = 'http://localhost:9876/v1'
    
    // Add plugin to config for npm plugin loading
    config.plugin = config.plugin || []
    if (!config.plugin.includes('opencode-nim-fix')) {
      config.plugin.push('opencode-nim-fix')
    }
    
    await writeFile(configPath, JSON.stringify(config, null, 2) + '\n')
    console.log('✓ Configuration updated successfully!\n')
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    console.log('Next steps:')
    console.log('  1. Start OpenCode: opencode')
    console.log('  2. Verify proxy is running: curl http://localhost:9876/_debug')
    console.log('  3. The nim-proxy plugin should start automatically')
    console.log('  4. Test with: opencode --provider nvidia\n')
    
    console.log('Troubleshooting:')
    console.log('  • Port 9876 already in use? Check: lsof -i :9876')
    console.log('  • Proxy not starting? Check OpenCode logs')
    console.log('  • Tools not working? Verify proxy logs at /_debug\n')
    
    console.log('To revert this change:')
    console.log(`  cp ${backupPath} ${configPath}`)
    console.log('  # Or manually edit ~/.config/opencode/opencode.json')
    console.log('  # Look for _comment field containing "proxy endpoint"\n')
    
  } catch (error) {
    console.error('❌ Failed to update configuration:', error)
    console.log('\nPlease report this issue or update manually.')
    console.log('Manual steps:')
    console.log('  1. Edit ~/.config/opencode/opencode.json')
    console.log('  2. Add or update provider.nvidia section:')
    console.log(JSON.stringify({
      nvidia: {
        npm: "@ai-sdk/openai-compatible",
        name: "NVIDIA NIM via Proxy",
        options: { baseURL: "http://localhost:9876/v1" }
      }
    }, null, 2))
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
