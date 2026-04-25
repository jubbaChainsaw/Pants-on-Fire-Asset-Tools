import React, { useState } from 'react';
import { Platform, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

const DEFAULT_WEB_URL = Platform.select({
  // Android emulator localhost mapping.
  android: 'http://10.0.2.2:5173',
  ios: 'http://localhost:5173',
  default: 'http://localhost:5173',
});

function readExpoPublicGameUrl() {
  if (typeof process === 'undefined' || !process?.env) {
    return '';
  }
  return process.env.EXPO_PUBLIC_GAME_URL || '';
}

function normalizeUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return '';
}

const GAME_URL = normalizeUrl(readExpoPublicGameUrl()) || normalizeUrl(DEFAULT_WEB_URL);

export default function App() {
  const [webErrorMessage, setWebErrorMessage] = useState('');
  const hasUrl = Boolean(GAME_URL);

  const showFallback = !hasUrl || Boolean(webErrorMessage);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Pants on Fire! Asset Tools</Text>
        <Text style={styles.subtitle}>Expo shell for admin tool testing (crash-safe)</Text>
      </View>
      {showFallback ? (
        <View style={styles.fallback}>
          <Text style={styles.fallbackTitle}>Web preview unavailable</Text>
          <Text style={styles.fallbackText}>
            {hasUrl
              ? webErrorMessage
              : 'Set EXPO_PUBLIC_GAME_URL to a reachable http(s) URL and rebuild the APK.'}
          </Text>
          <Text style={styles.fallbackText}>Current URL: {GAME_URL || '(not set)'}</Text>
        </View>
      ) : (
        <WebView
          source={{ uri: GAME_URL }}
          style={styles.webview}
          originWhitelist={['*']}
          setSupportMultipleWindows={false}
          startInLoadingState
          javaScriptEnabled
          mediaPlaybackRequiresUserAction
          onError={(event) => {
            setWebErrorMessage(`WebView error: ${event.nativeEvent.description || 'Unknown error'}`);
          }}
          onHttpError={(event) => {
            setWebErrorMessage(`HTTP ${event.nativeEvent.statusCode}: could not load configured URL.`);
          }}
        />
      )}
      <View style={styles.footer}>
        <Text style={styles.hint}>Running web build from: {GAME_URL}</Text>
        <Text style={styles.hint}>Use EXPO_PUBLIC_GAME_URL for physical devices.</Text>
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
  fallback: {
    flex: 1,
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 14,
    justifyContent: 'center',
  },
  fallbackTitle: {
    color: '#facc15',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  fallbackText: {
    color: '#e2e8f0',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 6,
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
