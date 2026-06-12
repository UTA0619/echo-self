import 'dart:io';

import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/auth/presentation/providers/auth_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// ── Logo ──────────────────────────────────────────────────────────────────────

class LoginLogo extends StatelessWidget {
  const LoginLogo({super.key});

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
          context.l10n.loginTagline,
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

class LoginFormCard extends StatelessWidget {
  const LoginFormCard({
    super.key,
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
              isCreatingAccount
                  ? context.l10n.loginCreateAccount
                  : context.l10n.loginWelcomeBack,
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
              decoration: InputDecoration(
                labelText: context.l10n.loginEmail,
                prefixIcon: const Icon(Icons.email_outlined),
              ),
              validator: (v) {
                if (v == null || v.trim().isEmpty) {
                  return context.l10n.loginEmailRequired;
                }
                if (!v.contains('@')) return context.l10n.loginEmailInvalid;
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
                labelText: context.l10n.loginPassword,
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
                if (v == null || v.isEmpty) {
                  return context.l10n.loginPasswordRequired;
                }
                if (isCreatingAccount && v.length < 6) {
                  return context.l10n.loginPasswordTooShort;
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
                  : Text(
                      isCreatingAccount
                          ? context.l10n.loginCreateAccount
                          : context.l10n.loginSignIn,
                    ),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: isLoading ? null : onToggleMode,
              child: Text(
                isCreatingAccount
                    ? context.l10n.loginToggleToSignIn
                    : context.l10n.loginToggleToCreate,
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

class LoginDivider extends StatelessWidget {
  const LoginDivider({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Expanded(child: Divider(color: EidolonColors.border)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Text(
            context.l10n.loginOrContinueWith,
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

class LoginSocialButtons extends ConsumerWidget {
  const LoginSocialButtons({super.key, required this.isLoading});
  final bool isLoading;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(authNotifierProvider.notifier);
    return Column(
      children: [
        LoginSocialButton(
          label: context.l10n.loginContinueGoogle,
          iconAsset: Icons.g_mobiledata_rounded,
          onTap: isLoading ? null : notifier.signInWithGoogle,
        ),
        if (Platform.isIOS) ...[
          const SizedBox(height: 12),
          LoginSocialButton(
            label: context.l10n.loginContinueApple,
            iconAsset: Icons.apple,
            onTap: isLoading ? null : notifier.signInWithApple,
          ),
        ],
      ],
    );
  }
}

class LoginSocialButton extends StatelessWidget {
  const LoginSocialButton({
    super.key,
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
