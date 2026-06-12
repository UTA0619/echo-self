import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/reality_sync/domain/entities/reality_sync_bonus.dart';
import 'package:eidolon/features/reality_sync/presentation/providers/reality_sync_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class RealitySyncCard extends ConsumerWidget {
  const RealitySyncCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(realitySyncNotifierProvider);

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Container(
        decoration: BoxDecoration(
          color: EidolonColors.surfaceElevated,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: EidolonColors.accent.withValues(alpha: 0.3),
          ),
        ),
        child: state.isLoading
            ? const _LoadingBody()
            : state.hasPermission
                ? _BonusBody(
                    bonus: state.bonus,
                    snapshot: state.snapshot,
                    onRefresh: () => ref
                        .read(realitySyncNotifierProvider.notifier)
                        .refresh(),
                  )
                : _PermissionBody(
                    onConnect: () => ref
                        .read(realitySyncNotifierProvider.notifier)
                        .requestPermissionAndFetch(),
                  ),
      ),
    );
  }
}

// ── Loading ────────────────────────────────────────────────────────────────────

class _LoadingBody extends StatelessWidget {
  const _LoadingBody();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.all(24),
      child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
    );
  }
}

// ── Permission prompt ──────────────────────────────────────────────────────────

class _PermissionBody extends StatelessWidget {
  const _PermissionBody({required this.onConnect});
  final VoidCallback onConnect;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text('⚡', style: TextStyle(fontSize: 20)),
              const SizedBox(width: 8),
              Text(
                context.l10n.realitySyncTitle,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      letterSpacing: 1.5,
                      color: EidolonColors.accentGlow,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            context.l10n.realitySyncConnect,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 4),
          Text(
            context.l10n.realitySyncDescription,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: EidolonColors.textSecondary,
                ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: onConnect,
              child: Text(context.l10n.buttonConnectHealth),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Bonus display ──────────────────────────────────────────────────────────────

class _BonusBody extends StatelessWidget {
  const _BonusBody({
    required this.bonus,
    required this.snapshot,
    required this.onRefresh,
  });
  final RealitySyncBonus? bonus;
  final dynamic snapshot;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    final b = bonus;
    if (b == null) {
      return const _LoadingBody();
    }

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text('⚡', style: TextStyle(fontSize: 16)),
              const SizedBox(width: 8),
              Text(
                context.l10n.realitySyncTitle,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      letterSpacing: 1.5,
                      color: EidolonColors.accentGlow,
                    ),
              ),
              const Spacer(),
              Text(
                context.l10n.realitySyncScore(b.syncScore),
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: _scoreColor(b.syncScore),
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(width: 4),
              GestureDetector(
                onTap: onRefresh,
                child: const Icon(
                  Icons.refresh,
                  size: 16,
                  color: EidolonColors.textSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _StatChip(
                icon: '⚔️',
                label: 'ATK',
                value: '+${b.atkBonus}',
                color: EidolonColors.gold,
              ),
              const SizedBox(width: 8),
              _StatChip(
                icon: '💚',
                label: 'HP',
                value: '${b.hpPercent}%',
                color: const Color(0xFF4CAF50),
              ),
              const SizedBox(width: 8),
              _StatChip(
                icon: '✨',
                label: 'EXP',
                value: '+${b.expBonus}',
                color: EidolonColors.accentGlow,
              ),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms);
  }

  Color _scoreColor(int score) {
    if (score >= 80) return const Color(0xFF4CAF50);
    if (score >= 50) return EidolonColors.gold;
    return EidolonColors.textSecondary;
  }
}

class _StatChip extends StatelessWidget {
  const _StatChip({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });
  final String icon;
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
        decoration: BoxDecoration(
          color: EidolonColors.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Column(
          children: [
            Text(icon, style: const TextStyle(fontSize: 16)),
            const SizedBox(height: 2),
            Text(
              value,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    color: color,
                    fontWeight: FontWeight.bold,
                  ),
            ),
            Text(
              label,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: EidolonColors.textSecondary,
                    fontSize: 9,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}
