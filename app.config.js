const appJson = require('./app.json');

const expo = appJson.expo || {};

module.exports = ({ config }) => ({
  ...config,
  ...expo,
  android: {
    ...(expo.android || {}),
    package: process.env.EXPO_ANDROID_PACKAGE || 'com.pantsonfire.assettools'
  },
  extra: {
    ...(expo.extra || {}),
    eas: {
      projectId: process.env.EXPO_EAS_PROJECT_ID || '00000000-0000-0000-0000-000000000000'
    }
  }
});
