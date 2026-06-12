import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/home/presentation/providers/home_provider.dart';
import 'package:flutter/material.dart';

/// Top greeting row: "Good morning, {name}" + streak badge.
class HomeGreetingHeader extends StatelessWidget {
  const HomeGreetingHeader({super.key, required this.state});
  final HomeState state;

  String _greeting(BuildContext context) {
    final hour = DateTime.now().hour;
    if (hour < 12) return context.l10n.homeGoodMorning;
    if (hour < 17) return context.l10n.homeGoodAfternoon;
    return context.l10n.homeGoodEvening;
  }

  @override
  Widget build(BuildContext context) {
    final name =
        state.player?.displayNameOrUsername ?? context.l10n.commonAdventurer;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${_greeting(context)},',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: EidolonColors.textSecondary,
                      ),
                ),
                Text(
                  name,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        color: EidolonColors.textPrimary,
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ],
            ),
          ),
          if (state.summary != null)
            HomeStreakBadge(streak: state.summary!.currentStreak),
        ],
      ),
    );
  }
}

/// Pill badge displaying the current login streak with a flame icon.
class HomeStreakBadge extends StatelessWidget {
  const HomeStreakBadge({super.key, required this.streak});
  final int streak;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [EidolonColors.accent, EidolonColors.accentDim],
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.local_fire_department,
            color: Colors.white,
            size: 16,
          ),
          const SizedBox(width: 4),
          Text(
            '$streak',
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }
}
