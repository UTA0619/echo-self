import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/auth/presentation/providers/auth_provider.dart';
import 'package:eidolon/features/settings/presentation/pages/legal_page.dart';
import 'package:eidolon/features/settings/presentation/widgets/settings_widgets.dart';
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
          context.l10n.settingsTitle,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 8),
        children: [
          SettingsProfileHeader(user: user),
          const SizedBox(height: 24),
          SettingsSectionHeader(title: context.l10n.settingsAccount),
          SettingsTile(
            icon: Icons.logout_rounded,
            label: context.l10n.settingsSignOut,
            isDestructive: true,
            onTap: () => _confirmSignOut(context, ref),
          ),
          SettingsTile(
            icon: Icons.delete_forever_rounded,
            label: context.l10n.settingsDeleteAccount,
            isDestructive: true,
            onTap: () => _confirmDeleteAccount(context, ref),
          ),
          const SizedBox(height: 16),
          SettingsSectionHeader(title: context.l10n.settingsAbout),
          versionAsync.when(
            data: (v) => SettingsTile(
              icon: Icons.info_outline_rounded,
              label: context.l10n.settingsVersion,
              trailing: v,
            ),
            loading: () => SettingsTile(
              icon: Icons.info_outline_rounded,
              label: context.l10n.settingsVersion,
              trailing: '…',
            ),
            error: (_, __) => const SizedBox.shrink(),
          ),
          SettingsTile(
            icon: Icons.privacy_tip_outlined,
            label: context.l10n.settingsPrivacyPolicy,
            showArrow: true,
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => const LegalPage(type: LegalPageType.privacy),
              ),
            ),
          ),
          SettingsTile(
            icon: Icons.article_outlined,
            label: context.l10n.settingsTermsOfService,
            showArrow: true,
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => const LegalPage(type: LegalPageType.terms),
              ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Future<void> _confirmDeleteAccount(
    BuildContext context,
    WidgetRef ref,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: EidolonColors.surface,
        title: Text(
          ctx.l10n.settingsDeleteConfirmTitle,
          style: Theme.of(ctx).textTheme.titleMedium,
        ),
        content: Text(
          ctx.l10n.settingsDeleteConfirmBody,
          style: Theme.of(ctx).textTheme.bodyMedium,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(
              ctx.l10n.buttonCancel,
              style: TextStyle(color: EidolonColors.textSecondary),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(
              ctx.l10n.buttonDelete,
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
          ctx.l10n.settingsConfirmIdentityTitle,
          style: Theme.of(ctx).textTheme.titleMedium,
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              ctx.l10n.settingsReauthBody,
              style: Theme.of(ctx).textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              obscureText: true,
              autofocus: true,
              style: const TextStyle(color: EidolonColors.textPrimary),
              decoration: InputDecoration(
                labelText: ctx.l10n.settingsPassword,
                labelStyle: const TextStyle(color: EidolonColors.textSecondary),
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
              ctx.l10n.buttonCancel,
              style: TextStyle(color: EidolonColors.textSecondary),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(
              ctx.l10n.buttonDelete,
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
          ctx.l10n.settingsSignOutConfirmTitle,
          style: Theme.of(ctx).textTheme.titleMedium,
        ),
        content: Text(
          ctx.l10n.settingsSignOutConfirmBody,
          style: Theme.of(ctx).textTheme.bodyMedium,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(
              ctx.l10n.buttonCancel,
              style: TextStyle(color: EidolonColors.textSecondary),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(
              ctx.l10n.settingsSignOut,
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
