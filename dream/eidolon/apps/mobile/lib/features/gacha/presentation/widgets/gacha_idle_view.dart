import 'dart:async';

import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_pull_result.dart';
import 'package:eidolon/features/gacha/presentation/providers/gacha_provider.dart';
import 'package:eidolon/features/gacha/presentation/widgets/gacha_buy_sheet.dart';
import 'package:eidolon/features/gacha/presentation/widgets/gacha_card.dart';
import 'package:eidolon/features/gacha/presentation/widgets/gacha_pull_controls.dart';
import 'package:eidolon/features/gacha/presentation/widgets/gacha_rates_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Idle / post-pull view: banner, pull buttons, buy link, rates, history.
class GachaIdleView extends ConsumerWidget {
  const GachaIdleView({super.key, required this.state});
  final GachaState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(gachaNotifierProvider.notifier);

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Column(
            children: [
              const SizedBox(height: 16),
              const GachaBannerSection(),
              const SizedBox(height: 32),
              GachaPullButtons(
                crystals: state.crystals,
                onSinglePull: () => unawaited(
                  _confirmPull(
                    context,
                    notifier,
                    count: 1,
                    crystals: state.crystals,
                  ),
                ),
                onTenPull: () => unawaited(
                  _confirmPull(
                    context,
                    notifier,
                    count: 10,
                    crystals: state.crystals,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              GachaBuyCrystalsButton(
                onTap: () => _showBuySheet(context, state, notifier),
              ),
              const SizedBox(height: 16),
              const GachaRatesCard(),
              const SizedBox(height: 24),
            ],
          ),
        ),
        if (state.history.isNotEmpty) ...[
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 12),
              child: Text(
                context.l10n.gachaRecentSummons,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      letterSpacing: 1.5,
                    ),
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            sliver: SliverList.builder(
              itemCount: state.history.length,
              itemBuilder: (ctx, i) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: GachaCard(
                  item: state.history[i],
                  index: i,
                  compact: true,
                ),
              ),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 32)),
        ],
      ],
    );
  }
}

/// Animated banner shown at the top of [GachaIdleView].
class GachaBannerSection extends StatelessWidget {
  const GachaBannerSection({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Container(
        width: double.infinity,
        height: 160,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              EidolonColors.accentDim.withValues(alpha: 0.8),
              EidolonColors.surface,
              EidolonColors.gold.withValues(alpha: 0.15),
            ],
          ),
          border: Border.all(
            color: EidolonColors.accent.withValues(alpha: 0.3),
          ),
        ),
        child: Stack(
          children: [
            // Background sparkles
            ...List.generate(8, (i) {
              final positions = [
                const Offset(20, 20),
                const Offset(80, 50),
                const Offset(140, 15),
                const Offset(200, 60),
                const Offset(260, 25),
                const Offset(300, 55),
                const Offset(50, 100),
                const Offset(220, 110),
              ];
              return Positioned(
                left: positions[i].dx,
                top: positions[i].dy,
                child: Text(
                  '✦',
                  style: TextStyle(
                    color: EidolonColors.gold
                        .withValues(alpha: 0.3 + (i % 3) * 0.1),
                    fontSize: 12 + (i % 3) * 4.0,
                  ),
                )
                    .animate(onPlay: (c) => c.repeat(reverse: true))
                    .fadeIn(
                      duration: Duration(milliseconds: 800 + i * 200),
                    )
                    .then()
                    .fadeOut(
                      duration: Duration(milliseconds: 800 + i * 200),
                    ),
              );
            }),
            // Content
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('🌀', style: TextStyle(fontSize: 48))
                      .animate(onPlay: (c) => c.repeat(reverse: true))
                      .scaleXY(
                        begin: 0.95,
                        end: 1.05,
                        duration: 2.seconds,
                      )
                      .rotate(
                        begin: -0.02,
                        end: 0.02,
                        duration: 3.seconds,
                      ),
                  const SizedBox(height: 8),
                  Text(
                    context.l10n.gachaSoulSummon,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          letterSpacing: 4,
                          color: EidolonColors.accentGlow,
                        ),
                  ),
                  Text(
                    context.l10n.gachaSoulSummonSubtitle,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Helpers used by GachaIdleView ─────────────────────────────────────────────

Future<void> _confirmPull(
  BuildContext context,
  GachaNotifier notifier, {
  required int count,
  required int crystals,
}) async {
  final cost = count == 1 ? kSinglePullCost : kTenPullCost;
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: EidolonColors.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Text(
        ctx.l10n.gachaSummonCount(count),
        style: Theme.of(ctx).textTheme.titleMedium,
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            ctx.l10n.gachaCostBalance(cost, crystals),
            style: Theme.of(ctx).textTheme.bodyMedium,
          ),
          const SizedBox(height: 8),
          Text(
            ctx.l10n.gachaConfirmSummon,
            style: Theme.of(ctx).textTheme.bodySmall,
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx, false),
          child: Text(ctx.l10n.buttonCancel),
        ),
        ElevatedButton(
          onPressed: () => Navigator.pop(ctx, true),
          child: Text(ctx.l10n.buttonSummon),
        ),
      ],
    ),
  );
  if (confirmed == true) unawaited(notifier.pull(count: count));
}

void _showBuySheet(
  BuildContext context,
  GachaState state,
  GachaNotifier notifier,
) {
  showModalBottomSheet<void>(
    context: context,
    backgroundColor: EidolonColors.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (_) => GachaBuyCrystalsSheet(state: state, notifier: notifier),
  );
}
