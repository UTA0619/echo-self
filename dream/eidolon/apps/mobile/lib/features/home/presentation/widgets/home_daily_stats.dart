import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/home/domain/entities/home_summary.dart';
import 'package:flutter/material.dart';

/// "Today's Stats" section showing dungeon runs and streak tiles.
class HomeDailyStats extends StatelessWidget {
  const HomeDailyStats({super.key, required this.summary});
  final HomeSummary? summary;

  @override
  Widget build(BuildContext context) {
    final runs = summary?.dungeonRunsToday ?? 0;
    final streak = summary?.currentStreak ?? 0;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "TODAY'S STATS",
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: EidolonColors.textSecondary,
                  letterSpacing: 1.5,
                ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: HomeStatTile(
                  icon: Icons.castle_outlined,
                  label: 'Runs Today',
                  value: '$runs / 5',
                  color: EidolonColors.accent,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: HomeStatTile(
                  icon: Icons.local_fire_department,
                  label: 'Day Streak',
                  value: '$streak',
                  color: EidolonColors.gold,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Individual stat tile used inside [HomeDailyStats].
class HomeStatTile extends StatelessWidget {
  const HomeStatTile({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: EidolonColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: EidolonColors.textPrimary,
                        fontWeight: FontWeight.bold,
                      ),
                ),
                Text(
                  label,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: EidolonColors.textSecondary,
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
