/**
 * Postinstall patch for Node 24+ on Windows.
 * Prevents Expo CLI from attempting to create shim folders with colons (like node:sea),
 * which is invalid on Windows filesystems.
 */
const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'node_modules', '@expo', 'cli', 'build', 'src', 'start', 'server', 'metro', 'externals.js');

if (fs.existsSync(targetPath)) {
  let content = fs.readFileSync(targetPath, 'utf8');
  if (!content.includes('|:/.test(x)')) {
    content = content.replace(
      '/\\//.test(x)',
      '/\\/|:/.test(x)'
    );
    fs.writeFileSync(targetPath, content, 'utf8');
    console.log('✓ Successfully applied Node 24 Windows compatibility patch to @expo/cli');
  }
}
