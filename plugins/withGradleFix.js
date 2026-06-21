const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withGradleFix(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const rnGradlePluginSettings = path.join(
        config.modRequest.projectRoot,
        'node_modules',
        '@react-native',
        'gradle-plugin',
        'settings.gradle.kts'
      );
      if (fs.existsSync(rnGradlePluginSettings)) {
        let content = fs.readFileSync(rnGradlePluginSettings, 'utf-8');
        content = content.replace('"0.5.0"', '"1.0.0"');
        fs.writeFileSync(rnGradlePluginSettings, content);
      }
      return config;
    },
  ]);
}

module.exports = withGradleFix;
