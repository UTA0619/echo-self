import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/auth/domain/entities/auth_user.dart';
import 'package:eidolon/features/auth/presentation/providers/auth_provider.dart';
import 'package:eidolon/features/settings/presentation/pages/legal_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'settings_page.g.dart';

@riverpod
Future<String> settingsAppVersion(Ref ref) async {
  final info = await PackageInfo.fromPlatform();
  return '${info.version} (${info.buildNumber})';
}

class SettingsPage extends ConsumerWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authNotifierProvider.select((s) => s.user));
    final versionAsync = ref.watch(settingsAppVersionProvider);

    return Scaffold(
      backgroundColor: EidolonColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(
          'Settings',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 8),
        children: [
          _ProfileHeader(user: user),
          const SizedBox(height: 24),

          _SectionHeader(title: 'Account'),
          _SettingsTile(
            icon: Icons.logout_rounded,
            label: 'Sign Out',
            isDestructive: true,
            onTap: () => _confirmSignOut(context, ref),
          ),
          _SettingsTile(
            icon: Icons.delete_forever_rounded,
            label: 'Delete Account',
            isDestructive: true,
            onTap: () => _confirmDeleteAccount(context, ref),
          ),

          const SizedBox(height: 16),
          _SectionHeader(title: 'About'),
          versionAsync.when(
            data: (v) => _SettingsTile(
              icon: Icons.info_outline_rounded,
              label: 'Version',
              trailing: v,
            ),
            loading: () => _SettingsTile(
              icon: Icons.info_outline_rounded,
              label: 'Version',
              trailing: '…',
            ),
            error: (_, __) => const SizedBox.shrink(),
          ),
          _SettingsTile(
            icon: Icons.privacy_tip_outlined,
            label: 'Privacy Policy',
            showArrow: true,
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) =>
                    const LegalPage(type: LegalPageType.privacy),
              ),
            ),
          ),
          _SettingsTile(
            icon: Icons.article_outlined,
            label: 'Terms of Service',
            showArrow: true,
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) =>
                    const LegalPage(type: LegalPageType.terms),
              ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Future<void> _confirmDeleteAccount(
      BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: EidolonColors.surface,
        title: Text(
          'Delete Account?',
          style: Theme.of(ctx).textTheme.titleMedium,
        ),
        content: Text(
          'This permanently deletes your Eidolon, dungeon history, and all '
          'data. This action cannot be undone.',
          style: Theme.of(ctx).textTheme.bodyMedium,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(
              'Cancel',
              style: TextStyle(color: EidolonColors.textSecondary),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(
              'Delete',
              style: TextStyle(color: EidolonColors.error),
            ),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    await ref.read(authNotifierProvider.notifier).deleteAccount();

    if (!context.mounted) return;
    // If Firebase requires re-authentication, prompt for password
    final needsReAuth = ref.read(authNotifierProvider).needsReAuth;
    if (needsReAuth) {
      await _reauthAndDelete(context, ref);
    }
  }

  Future<void> _reauthAndDelete(BuildContext context, WidgetRef ref) async {
    final user = ref.read(authNotifierProvider).user;
    final email = user?.email ?? '';
    final controller = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: EidolonColors.surface,
        title: Text(
          'Confirm Identity',
          style: Theme.of(ctx).textTheme.titleMedium,
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'For security, enter your password to permanently delete '
              'your account.',
              style: Theme.of(ctx).textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              obscureText: true,
              autofocus: true,
              style: const TextStyle(color: EidolonColors.textPrimary),
              decoration: InputDecoration(
                labelText: 'Password',
                labelStyle:
                    const TextStyle(color: EidolonColors.textSecondary),
                enabledBorder: OutlineInputBorder(
                  borderSide: const BorderSide(color: EidolonColors.border),
                  borderRadius: BorderRadius.circular(8),
                ),
                focusedBorder: OutlineInputBorder(
                  borderSide: const BorderSide(color: EidolonColors.accent),
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(
              'Cancel',
              style: TextStyle(color: EidolonColors.textSecondary),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(
              'Delete',
              style: TextStyle(color: EidolonColors.error),
            ),
          ),
        ],
      ),
    );

    controller.dispose();
    if (confirmed != true || !context.mounted) return;

    await ref.read(authNotifierProvider.notifier).reauthenticateAndDelete(
          email: email,
          password: controller.text,
        );
  }

  Future<void> _confirmSignOut(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: EidolonColors.surface,
        title: Text(
          'Sign Out?',
          style: Theme.of(ctx).textTheme.titleMedium,
        ),
        content: Text(
          'Your Eidolon will wait for your return.',
          style: Theme.of(ctx).textTheme.bodyMedium,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(
              'Cancel',
              style: TextStyle(color: EidolonColors.textSecondary),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(
              'Sign Out',
              style: TextStyle(color: EidolonColors.error),
            ),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await ref.read(authNotifierProvider.notifier).signOut();
    }
  }

}

// ── Profile header ────────────────────────────────────────────────────────────

class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({required this.user});
  final AuthUser? user;

  @override
  Widget build(BuildContext context) {
    final name = user?.nameOrFallback ?? 'Adventurer';
    final email = user?.email ?? '';
    final initials = name.isNotEmpty ? name[0].toUpperCase() : '?';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Row(
        children: [
          // Avatar
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [EidolonColors.accent, EidolonColors.soulCore],
              ),
              boxShadow: [
                BoxShadow(
                  color: EidolonColors.accent.withValues(alpha: 0.35),
                  blurRadius: 16,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: Center(
              child: Text(
                initials,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
              ),
            ),
          ),
          const SizedBox(width: 16),
          // Name + email
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                  overflow: TextOverflow.ellipsis,
                ),
                if (email.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    email,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: EidolonColors.textSecondary,
                        ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Section header ────────────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 4, 24, 4),
      child: Text(
        title.toUpperCase(),
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              letterSpacing: 1.5,
              color: EidolonColors.textSecondary,
            ),
      ),
    );
  }
}

// ── Settings tile ─────────────────────────────────────────────────────────────

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({
    required this.icon,
    required this.label,
    this.trailing,
    this.showArrow = false,
    this.isDestructive = false,
    this.onTap,
  });

  final IconData icon;
  final String label;
  final String? trailing;
  final bool showArrow;
  final bool isDestructive;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final color = isDestructive ? EidolonColors.error : EidolonColors.textPrimary;

    return Semantics(
      button: onTap != null,
      label: label,
      hint: isDestructive ? 'Destructive action' : null,
      child: Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        splashColor: EidolonColors.accent.withValues(alpha: 0.08),
        highlightColor: EidolonColors.accent.withValues(alpha: 0.04),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          child: Row(
            children: [
              Icon(icon, size: 20, color: color.withValues(alpha: 0.8)),
              const SizedBox(width: 16),
              Expanded(
                child: Text(
                  label,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: color),
                ),
              ),
              if (trailing != null)
                Text(
                  trailing!,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: EidolonColors.textSecondary,
                      ),
                ),
              if (showArrow)
                Icon(
                  Icons.chevron_right_rounded,
                  size: 20,
                  color: EidolonColors.textSecondary,
                ),
            ],
          ),
        ),
      ),
    ),
    );
  }
}
