import 'dart:io';

import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/auth/presentation/providers/auth_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _isCreatingAccount = false;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final notifier = ref.read(authNotifierProvider.notifier);
    if (_isCreatingAccount) {
      await notifier.createAccount(
        email: _emailCtrl.text.trim(),
        password: _passwordCtrl.text,
      );
    } else {
      await notifier.signInWithEmail(
        email: _emailCtrl.text.trim(),
        password: _passwordCtrl.text,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authNotifierProvider);

    ref.listen(authNotifierProvider, (prev, next) {
      if (next.errorMessage != null &&
          prev?.errorMessage != next.errorMessage) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.errorMessage!),
            backgroundColor: EidolonColors.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
        ref.read(authNotifierProvider.notifier).clearError();
      }
    });

    return Scaffold(
      backgroundColor: EidolonColors.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox(height: 48),
                _Logo(),
                const SizedBox(height: 48),
                _FormCard(
                  formKey: _formKey,
                  emailCtrl: _emailCtrl,
                  passwordCtrl: _passwordCtrl,
                  isCreatingAccount: _isCreatingAccount,
                  obscurePassword: _obscurePassword,
                  isLoading: authState.isLoading,
                  onToggleObscure: () =>
                      setState(() => _obscurePassword = !_obscurePassword),
                  onToggleMode: () {
                    setState(() => _isCreatingAccount = !_isCreatingAccount);
                    ref.read(authNotifierProvider.notifier).clearError();
                  },
                  onSubmit: _submit,
                ),
                const SizedBox(height: 24),
                _Divider(),
                const SizedBox(height: 24),
                _SocialButtons(isLoading: authState.isLoading),
                const SizedBox(height: 48),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ── Logo ──────────────────────────────────────────────────────────────────────

class _Logo extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: const RadialGradient(
              colors: [EidolonColors.accent, EidolonColors.accentDim],
            ),
            boxShadow: [
              BoxShadow(
                color: EidolonColors.accent.withValues(alpha: 0.4),
                blurRadius: 24,
                spreadRadius: 4,
              ),
            ],
          ),
          child: const Icon(Icons.auto_awesome, color: Colors.white, size: 36),
        ),
        const SizedBox(height: 16),
        Text(
          'EIDOLON',
          style: Theme.of(context).textTheme.displaySmall?.copyWith(
                color: EidolonColors.textPrimary,
                letterSpacing: 8,
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 4),
        Text(
          'YOUR SOUL-TWIN AWAITS',
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: EidolonColors.textSecondary,
                letterSpacing: 3,
              ),
        ),
      ],
    );
  }
}

// ── Form card ─────────────────────────────────────────────────────────────────

class _FormCard extends StatelessWidget {
  const _FormCard({
    required this.formKey,
    required this.emailCtrl,
    required this.passwordCtrl,
    required this.isCreatingAccount,
    required this.obscurePassword,
    required this.isLoading,
    required this.onToggleObscure,
    required this.onToggleMode,
    required this.onSubmit,
  });

  final GlobalKey<FormState> formKey;
  final TextEditingController emailCtrl;
  final TextEditingController passwordCtrl;
  final bool isCreatingAccount;
  final bool obscurePassword;
  final bool isLoading;
  final VoidCallback onToggleObscure;
  final VoidCallback onToggleMode;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: EidolonColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: EidolonColors.accent.withValues(alpha: 0.15),
        ),
      ),
      child: Form(
        key: formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              isCreatingAccount ? 'Create Account' : 'Welcome Back',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: EidolonColors.textPrimary,
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 20),
            TextFormField(
              controller: emailCtrl,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              style: const TextStyle(color: EidolonColors.textPrimary),
              decoration: const InputDecoration(
                labelText: 'Email',
                prefixIcon: Icon(Icons.email_outlined),
              ),
              validator: (v) {
                if (v == null || v.trim().isEmpty) return 'Email is required';
                if (!v.contains('@')) return 'Enter a valid email';
                return null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: passwordCtrl,
              obscureText: obscurePassword,
              textInputAction: TextInputAction.done,
              onFieldSubmitted: (_) => onSubmit(),
              style: const TextStyle(color: EidolonColors.textPrimary),
              decoration: InputDecoration(
                labelText: 'Password',
                prefixIcon: const Icon(Icons.lock_outlined),
                suffixIcon: IconButton(
                  icon: Icon(
                    obscurePassword
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                  ),
                  onPressed: onToggleObscure,
                ),
              ),
              validator: (v) {
                if (v == null || v.isEmpty) return 'Password is required';
                if (isCreatingAccount && v.length < 6) {
                  return 'Password must be at least 6 characters';
                }
                return null;
              },
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: isLoading ? null : onSubmit,
              child: isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Text(isCreatingAccount ? 'Create Account' : 'Sign In'),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: isLoading ? null : onToggleMode,
              child: Text(
                isCreatingAccount
                    ? 'Already have an account? Sign in'
                    : "Don't have an account? Create one",
                style: const TextStyle(color: EidolonColors.accent),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Divider ───────────────────────────────────────────────────────────────────

class _Divider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Expanded(child: Divider(color: EidolonColors.border)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Text(
            'or continue with',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: EidolonColors.textSecondary,
                ),
          ),
        ),
        const Expanded(child: Divider(color: EidolonColors.border)),
      ],
    );
  }
}

// ── Social buttons ────────────────────────────────────────────────────────────

class _SocialButtons extends ConsumerWidget {
  const _SocialButtons({required this.isLoading});
  final bool isLoading;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(authNotifierProvider.notifier);
    return Column(
      children: [
        _SocialButton(
          label: 'Continue with Google',
          iconAsset: Icons.g_mobiledata_rounded,
          onTap: isLoading ? null : notifier.signInWithGoogle,
        ),
        if (Platform.isIOS) ...[
          const SizedBox(height: 12),
          _SocialButton(
            label: 'Continue with Apple',
            iconAsset: Icons.apple,
            onTap: isLoading ? null : notifier.signInWithApple,
          ),
        ],
      ],
    );
  }
}

class _SocialButton extends StatelessWidget {
  const _SocialButton({
    required this.label,
    required this.iconAsset,
    required this.onTap,
  });

  final String label;
  final IconData iconAsset;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: onTap,
      icon: Icon(iconAsset, size: 22),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(48),
        foregroundColor: EidolonColors.textPrimary,
        side: const BorderSide(color: EidolonColors.border),
        backgroundColor: EidolonColors.surface,
      ),
    );
  }
}
