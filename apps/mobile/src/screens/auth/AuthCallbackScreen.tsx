import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/auth';
import { Colors } from '../../theme/tokens';

/**
 * AuthCallbackScreen
 *
 * Handles the deep-link callback from Supabase magic-link and OAuth flows.
 * The URL scheme `echoself://auth/callback` is registered in app.json.
 *
 * Supabase automatically picks up the hash tokens from the URL via
 * onAuthStateChange — we just need to wait and show a spinner.
 */
export function AuthCallbackScreen() {
  const { loadProfile } = useAuthStore();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await loadProfile(session.user.id);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.indigo} />
      <Text style={styles.text}>Signing you in…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  text: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
});
