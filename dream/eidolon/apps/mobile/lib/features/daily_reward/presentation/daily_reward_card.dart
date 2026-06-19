import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/daily_reward/presentation/daily_reward_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// A claimable daily-login bonus shown on the home screen — the small reason to
/// open the app every day. Renders nothing once today's reward is taken.
class DailyRewardCard extends ConsumerWidget {
  const DailyRewardCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(dailyRewardNotifierProvider).valueOrNull;
    if (state == null || !state.claimable) return const SizedBox.shrink();
    final notifier = ref.read(dailyRewardNotifierProvider.notifier);

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: EidolonColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: EidolonColors.gold.withValues(alpha: 0.4)),
        ),
        child: Row(
          children: [
            const Icon(Icons.card_giftcard, color: EidolonColors.gold, size: 32),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${context.l10n.dailyRewardTitle}  ·  '
                    '${context.l10n.dailyRewardStreak(state.streakDay)}',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: EidolonColors.textPrimary,
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    context.l10n.dailyRewardFlavor,
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: EidolonColors.textSecondary,
                        ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            ElevatedButton(
              onPressed: state.isClaiming ? null : notifier.claim,
              style: ElevatedButton.styleFrom(
                backgroundColor: EidolonColors.gold,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              ),
              child: state.isClaiming
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Text(
                      '+${state.reward}  ${context.l10n.dailyRewardClaim}',
                      style: const TextStyle(
                        color: Color(0xFF3D2A05),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
            ),
          ],
        ),
      ).animate().fadeIn(duration: 400.ms).slideY(begin: -0.2, end: 0),
    );
  }
}
