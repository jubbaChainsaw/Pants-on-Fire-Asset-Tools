const appJson = require('./app.json');

const expo = appJson.expo || {};
const easFromJson = expo.extra && expo.extra.eas ? expo.extra.eas : {};
const resolvedProjectId = process.env.EXPO_EAS_PROJECT_ID || easFromJson.projectId;

module.exports = ({ config }) => ({
  ...config,
  ...expo,
  android: {
    ...(expo.android || {}),
    package: process.env.EXPO_ANDROID_PACKAGE || 'com.pantsonfire.assettools'
  },
  extra: {
    ...(expo.extra || {}),
    ...(resolvedProjectId
      ? {
          eas: {
            ...easFromJson,
            projectId: resolvedProjectId
          }
        }
      : {})
  }
});
