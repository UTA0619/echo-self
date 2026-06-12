import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// "Quick Actions" row with Dungeon and Eidolon chat cards.
class HomeQuickActions extends StatelessWidget {
  const HomeQuickActions({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            context.l10n.homeQuickActions,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: EidolonColors.textSecondary,
                  letterSpacing: 1.5,
                ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: HomeActionCard(
                  icon: Icons.castle_outlined,
                  label: context.l10n.dungeonEnter,
                  gradientColors: const [
                    Color(0xFF4A1A7A),
                    Color(0xFF2D0D5A),
                  ],
                  borderColor: EidolonColors.accent,
                  onTap: () => context.go('/dungeon'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: HomeActionCard(
                  icon: Icons.chat_bubble_outline,
                  label: context.l10n.homeTalkWithEidolon,
                  gradientColors: const [
                    Color(0xFF1A3A4A),
                    Color(0xFF0D2535),
                  ],
                  borderColor: Color(0xFF4AABCC),
                  onTap: () => context.go('/eidolon'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Individual action card used in [HomeQuickActions].
class HomeActionCard extends StatelessWidget {
  const HomeActionCard({
    super.key,
    required this.icon,
    required this.label,
    required this.gradientColors,
    required this.borderColor,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final List<Color> gradientColors;
  final Color borderColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label,
      button: true,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: gradientColors,
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: borderColor.withValues(alpha: 0.4),
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: borderColor, size: 28),
              const SizedBox(height: 8),
              Text(
                label,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: EidolonColors.textPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
