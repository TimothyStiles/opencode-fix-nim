export default async function demoPlugin(ctx: any) {
  // Minimal activation that is easy to verify: write a file and log to console
  try {
    const fs = await import('fs/promises');
    const path = '.opencode/demo-activated.txt';
    const content = `Demo plugin activated at ${new Date().toISOString()}\n`;
    await fs.writeFile(path, content, { encoding: 'utf8' });
    // eslint-disable-next-line no-console
    console.log('OpenCode demo plugin: wrote', path);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('OpenCode demo plugin: failed to write activation file', err);
  }

  // Return nothing special — this keeps the plugin minimal and broadly compatible.
  return {};
}
