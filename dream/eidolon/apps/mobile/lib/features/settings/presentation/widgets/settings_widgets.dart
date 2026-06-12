import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/auth/domain/entities/auth_user.dart';
import 'package:flutter/material.dart';

// ── Profile header ────────────────────────────────────────────────────────────

class SettingsProfileHeader extends StatelessWidget {
  const SettingsProfileHeader({super.key, required this.user});
  final AuthUser? user;

  @override
  Widget build(BuildContext context) {
    final name = user?.nameOrFallback ?? context.l10n.commonAdventurer;
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

class SettingsSectionHeader extends StatelessWidget {
  const SettingsSectionHeader({super.key, required this.title});
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

class SettingsTile extends StatelessWidget {
  const SettingsTile({
    super.key,
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
    final color =
        isDestructive ? EidolonColors.error : EidolonColors.textPrimary;

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
                    style: Theme.of(context)
                        .textTheme
                        .bodyLarge
                        ?.copyWith(color: color),
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
