const fs = require('fs');
const path = require('path');

const plugin = require('../plugins/withAndroidWidgets');
const projectRoot = path.resolve(__dirname, '..');

// Test running the dangerous mod callback
const config = {
  modRequest: { projectRoot },
};

// Read the plugin source and extract withWidgetNativeFiles
const resDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');
const javaDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', 'com', 'qashi', 'islamic');

console.log('Writing files to:', resDir, javaDir);

// We can just require the dangerous mod function from the plugin
// by mocking withDangerousMod
const dangerousModFn = async () => {
  // Execute the logic in plugins/withAndroidWidgets.js
  const pluginSrc = fs.readFileSync(path.join(projectRoot, 'plugins', 'withAndroidWidgets.js'), 'utf8');
  
  // Extract and run withWidgetNativeFiles
  const funcMatch = pluginSrc.match(/return withDangerousMod\(config, \['android', async \(config\) => {([\s\S]*?)}\]\);/);
  if (!funcMatch) {
    throw new Error('Could not find withDangerousMod in plugins/withAndroidWidgets.js');
  }
  
  const innerCode = funcMatch[1];
  const runFn = new Function('config', 'fs', 'path', 'PACKAGE', innerCode);
  await runFn(config, fs, path, 'com.qashi.islamic');
  console.log('Successfully synced all widget resources and Kotlin files to android/');
};

dangerousModFn().catch(err => {
  console.error('Error syncing:', err);
  process.exit(1);
});
