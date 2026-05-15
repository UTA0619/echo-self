import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/auth';
import { Colors, Spacing, Typography } from '../../theme/tokens';
import { HapticPatterns } from '../../theme/haptics';

type Step = 'landing' | 'magic-link' | 'check-email';

// Hoisted static styles to avoid re-creation on each render
const appleButtonStyle = {
  width: '100%' as const,
  height: 52,
  borderRadius: 14,
};

export function LoginScreen() {
  const [step, setStep] = useState<Step>('landing');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const { loadProfile } = useAuthStore();

  const emailUnderlineWidth = useSharedValue(0);

  const underlineStyle = useAnimatedStyle(() => ({
    width: `${emailUnderlineWidth.value}%`,
  }));

  const handleFocus = () => {
    emailUnderlineWidth.value = withTiming(100, { duration: 250 });
  };

  const handleBlur = () => {
    emailUnderlineWidth.value = withTiming(0, { duration: 200 });
  };

  const handleMagicLink = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    setIsLoading(true);
    HapticPatterns.light();
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: 'echoself://auth/callback',
          shouldCreateUser: true,
        },
      });
      if (error) throw error;
      setStep('check-email');
      HapticPatterns.success();
    } catch (err: any) {
      HapticPatterns.error();
      Alert.alert('Error', err?.message ?? 'Failed to send magic link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    HapticPatterns.light();
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken ?? '',
        nonce: credential.user,
      });

      if (error) throw error;
      if (data.user) {
        await loadProfile(data.user.id);
        HapticPatterns.success();
      }
    } catch (err: any) {
      if (err?.code === 'ERR_REQUEST_CANCELED') return; // user dismissed
      HapticPatterns.error();
      Alert.alert('Apple Sign In Failed', err?.message ?? 'Please try again.');
    }
  };

  const handleGoogleSignIn = async () => {
    HapticPatterns.light();
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'echoself://auth/callback',
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (error) throw error;
      if (data.url) {
        await Linking.openURL(data.url);
      }
    } catch (err: any) {
      HapticPatterns.error();
      Alert.alert('Google Sign In Failed', err?.message ?? 'Please try again.');
    }
  };

  if (step === 'check-email') {
    return <CheckEmailScreen email={email} onBack={() => setStep('magic-link')} />;
  }

  if (step === 'magic-link') {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
            <TouchableOpacity onPress={() => setStep('landing')} style={styles.backBtn}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Enter your email</Text>
            <Text style={styles.subtitle}>
              We'll send a magic link — no password needed.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={handleMagicLink}
              onFocus={handleFocus}
              onBlur={handleBlur}
              autoFocus
            />
            <View style={styles.underlineTrack}>
              <Animated.View style={[styles.underlineFill, underlineStyle]} />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <TouchableOpacity
              style={[styles.primaryBtn, (!email.includes('@') || isLoading) && styles.btnDisabled]}
              onPress={handleMagicLink}
              disabled={!email.includes('@') || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Send Magic Link →</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Landing
  return (
    <View style={styles.container}>
      <Animated.View entering={FadeIn.duration(600)} style={styles.logoSection}>
        <Text style={styles.logo}>ECHO//SELF</Text>
        <Text style={styles.tagline}>Know who you're becoming</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.authSection}>
        <BlurView intensity={15} tint="dark" style={styles.authCard}>
          {/* Apple Sign In */}
          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={14}
              style={appleButtonStyle}
              onPress={handleAppleSignIn}
            />
          )}

          {/* Google Sign In */}
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleGoogleSignIn}
            activeOpacity={0.8}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleText}>Continue with Google</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Magic Link */}
          <TouchableOpacity
            style={styles.magicLinkBtn}
            onPress={() => setStep('magic-link')}
            activeOpacity={0.8}
          >
            <Text style={styles.magicLinkText}>✉️  Continue with Email</Text>
          </TouchableOpacity>
        </BlurView>

        <Text style={styles.terms}>
          By continuing, you agree to our{' '}
          <Text
            style={styles.link}
            onPress={() => Linking.openURL('https://echoself.app/terms')}
          >
            Terms
          </Text>{' '}
          and{' '}
          <Text
            style={styles.link}
            onPress={() => Linking.openURL('https://echoself.app/privacy')}
          >
            Privacy Policy
          </Text>
        </Text>
      </Animated.View>
    </View>
  );
}

// Extracted to avoid defining components inside components (react-best-practices: rerender-no-inline-components)
interface CheckEmailProps {
  email: string;
  onBack: () => void;
}

function CheckEmailScreen({ email, onBack }: CheckEmailProps) {
  return (
    <View style={styles.container}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.checkEmailSection}>
        <Text style={styles.checkEmailEmoji}>📬</Text>
        <Text style={styles.title}>Check your inbox</Text>
        <Text style={styles.subtitle}>
          We sent a magic link to{'\n'}
          <Text style={styles.emailHighlight}>{email}</Text>
        </Text>
        <Text style={styles.checkEmailHint}>
          Tap the link in your email to sign in. It expires in 1 hour.
        </Text>
        <TouchableOpacity onPress={onBack} style={styles.backBtnLarge}>
          <Text style={styles.backBtnLargeText}>← Use a different email</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: Colors.black,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 48,
  },
  logoSection: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logo: {
    ...Typography.displayLg,
    color: Colors.white,
    letterSpacing: -2,
  },
  tagline: {
    ...Typography.bodyMd,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  authSection: {
    gap: Spacing.md,
  },
  authCard: {
    borderRadius: 24,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border1,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface2,
    borderRadius: 14,
    height: 52,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border1,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.white,
  },
  googleText: {
    ...Typography.headingMd,
    color: Colors.white,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border0,
  },
  dividerText: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  magicLinkBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border1,
    backgroundColor: Colors.surface1,
  },
  magicLinkText: {
    ...Typography.headingMd,
    color: Colors.textSecondary,
  },
  terms: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    color: Colors.indigo,
    textDecorationLine: 'underline',
  },
  // Magic link form
  header: {
    gap: Spacing.sm,
    paddingTop: 20,
  },
  backBtn: {
    marginBottom: Spacing.sm,
  },
  backText: {
    ...Typography.bodyMd,
    color: Colors.textSecondary,
  },
  title: {
    ...Typography.displayMd,
    color: Colors.white,
  },
  subtitle: {
    ...Typography.bodyMd,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  inputWrapper: {
    gap: 0,
  },
  input: {
    ...Typography.headingLg,
    color: Colors.white,
    paddingVertical: Spacing.md,
    paddingHorizontal: 0,
  },
  underlineTrack: {
    height: 1,
    backgroundColor: Colors.border1,
  },
  underlineFill: {
    height: 1,
    backgroundColor: Colors.indigo,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 999,
    backgroundColor: Colors.indigo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  primaryBtnText: {
    ...Typography.headingMd,
    color: Colors.white,
  },
  // Check email
  checkEmailSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  checkEmailEmoji: {
    fontSize: 56,
    marginBottom: Spacing.sm,
  },
  checkEmailHint: {
    ...Typography.bodySm,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  emailHighlight: {
    color: Colors.indigo,
    fontWeight: '600',
  },
  backBtnLarge: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  backBtnLargeText: {
    ...Typography.bodyMd,
    color: Colors.textSecondary,
  },
});
