#!/usr/bin/env bun

import { join } from 'path'
import { homedir } from 'os'
import { existsSync } from 'fs'

async function updateConfig() {
  const configPath = join(homedir(), '.config', 'opencode', 'opencode.json')
  const pluginPath = join(homedir(), '.config', 'opencode', 'plugins', 'opencode-nim-fix.ts')
  const backupPath = `${configPath}.backup-${Date.now()}`
  const pluginFromPackage = join(process.cwd(), '.opencode', 'plugins', 'opencode-nim-fix.ts')
  
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
    const configContent = await Bun.file(configPath).text()
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
    console.log(`  - provider.nvidia._comment: "proxy endpoint..."\n`)
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    const isCI = process.env.CI || process.env.NON_INTERACTIVE
    
    if (!isCI) {
      console.log('Do you want to proceed with these changes? [y/N]')
      
      const reader = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      })
      
      const answer = await new Promise(resolve => {
        reader.question('', response => {
          reader.close()
          resolve(response)
        })
      })
      
      if (!answer || !['y', 'yes'].includes(answer.toLowerCase())) {
        console.log('\n❌ Installation cancelled by user')
        console.log('No changes were made to your configuration.\n')
        process.exit(0)
      }
    }
    
    console.log('\n🔄 Proceeding with installation...\n')
    
    console.log('Creating backup...')
    await Bun.write(backupPath, configContent)
    console.log(`✓ Backup created: ${backupPath}\n`)
    
    console.log('Installing plugin...')
    
    const userPluginDir = join(homedir(), '.config', 'opencode', 'plugins')
    const targetPluginPath = join(userPluginDir, 'opencode-nim-fix.ts')
    
    if (!existsSync(userPluginDir)) {
      console.log(`\n❌ OpenCode plugin directory not found: ${userPluginDir}`)
      console.log('Please ensure OpenCode is properly installed.\n')
      process.exit(1)
    }
    
    if (!existsSync(pluginFromPackage)) {
      console.log(`\n❌ Plugin file not found in package: ${pluginFromPackage}`)
      console.log('The package might be corrupted. Please reinstall.\n')
      process.exit(1)
    }
    
    try {
      await Bun.write(targetPluginPath, await Bun.file(pluginFromPackage).text())
      console.log(`✓ Plugin installed to: ${targetPluginPath}\n`)
    } catch (error) {
      console.log(`\n❌ Failed to install plugin: ${error}`)
      console.log(`Source: ${pluginFromPackage}`)
      console.log(`Target: ${targetPluginPath}\n`)
      process.exit(1)
    }
    
    console.log('Updating configuration...')
    
    config.provider = config.provider || {}
    config.provider.nvidia = config.provider.nvidia || {}
    
    config.provider.nvidia._comment = [
      'Added by opencode-nim-proxy plugin',
      'Redirects NVIDIA NIM requests through localhost:9876 proxy',
      'This fixes tool call formatting issues with NVIDIA NIM API',
      'Original endpoint (for revert): ' + originalUrl,
      'Current endpoint: http://localhost:9876/v1',
      'To revert: Restore from backup or manually edit baseURL',
    ].join(' | ')
    
    config.provider.nvidia.npm = '@ai-sdk/openai-compatible'
    config.provider.nvidia.name = 'NVIDIA NIM via Proxy'
    config.provider.nvidia.options = config.provider.nvidia.options || {}
    config.provider.nvidia.options.baseURL = 'http://localhost:9876/v1'
    
    await Bun.write(configPath, JSON.stringify(config, null, 2) + '\n')
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

if (import.meta.main) {
  await updateConfig().catch(error => {
    console.error('\nInstallation failed:', error)
    process.exit(1)
  })
}

e
export default updateConfig