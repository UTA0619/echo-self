import React, { Component, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { RootNavigator } from './navigation';
import { Analytics, initAnalytics } from './lib/analytics';

// ─── Global Error Boundary ────────────────────────────────────────────────────
// Catches unexpected JS errors so the app never shows a white crash screen.
// Apple requires a graceful error state (guideline 2.1).

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Forward to Sentry (and breadcrumb context) via the analytics layer.
    Analytics.error(error, { componentStack: info.componentStack ?? 'unknown' });
  }

  handleReset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <View style={styles.errorContainer} accessibilityRole="alert">
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMsg}>
            {this.state.error.message ?? 'An unexpected error occurred.'}
          </Text>
          <Pressable
            onPress={this.handleReset}
            style={styles.retryBtn}
            accessibilityLabel="Retry"
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#0A0B0F',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  errorEmoji: { fontSize: 48 },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F0F0F5',
    textAlign: 'center',
  },
  errorMsg: {
    fontSize: 14,
    color: '#8B8FA8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  retryBtn: {
    backgroundColor: '#7B6CF6',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});

// ─── App root ─────────────────────────────────────────────────────────────────

export default function App() {
  // Initialise Sentry + PostHog once, before the navigator mounts.
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <AppErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" />
        <RootNavigator />
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}
