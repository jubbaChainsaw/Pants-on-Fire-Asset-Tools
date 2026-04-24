import React from 'react';
import { Platform, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

const DEFAULT_WEB_URL = Platform.select({
  // Android emulator localhost mapping.
  android: 'http://10.0.2.2:5173',
  ios: 'http://localhost:5173',
  default: 'http://localhost:5173',
});

const GAME_URL = process.env.EXPO_PUBLIC_GAME_URL || DEFAULT_WEB_URL;

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Pants on Fire! Asset Tools</Text>
        <Text style={styles.subtitle}>Expo shell for admin tool testing</Text>
      </View>
      <WebView
        source={{ uri: GAME_URL }}
        style={styles.webview}
        startInLoadingState
        javaScriptEnabled
        mediaPlaybackRequiresUserAction
      />
      <View style={styles.footer}>
        <Text style={styles.hint}>Running web build from: {GAME_URL}</Text>
        <Text style={styles.hint}>Start Vite with: npm run dev</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#120038',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    color: '#facc15',
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: '#67e8f9',
    marginTop: 2,
    fontSize: 12,
  },
  webview: {
    flex: 1,
    backgroundColor: '#120038',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  hint: {
    color: '#cbd5e1',
    fontSize: 11,
  },
});
