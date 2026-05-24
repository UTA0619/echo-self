import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_item.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_pull_result.dart';
import 'package:eidolon/features/gacha/presentation/providers/gacha_provider.dart';
import 'package:eidolon/features/gacha/presentation/widgets/crystal_counter.dart';
import 'package:eidolon/features/gacha/presentation/widgets/gacha_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class GachaPage extends ConsumerWidget {
  const GachaPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(gachaNotifierProvider);

    // Listen for errors → show SnackBar
    ref.listen(gachaNotifierProvider.select((s) => s.errorMessage), (_, msg) {
      if (msg == null) return;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            content: Text(msg),
            backgroundColor: EidolonColors.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      ref.read(gachaNotifierProvider.notifier).clearError();
    });

    return Scaffold(
      backgroundColor: EidolonColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text('Summon', style: Theme.of(context).textTheme.titleMedium),
        centerTitle: true,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: CrystalCounter(
              count: state.crystals,
              isLoading: state.isLoading,
            ),
          ),
        ],
      ),
      body: switch (state.phase) {
        GachaPhase.idle || GachaPhase.done => _IdleView(state: state),
        GachaPhase.pulling => const _PullingView(),
        GachaPhase.revealing => _RevealView(
            result: state.lastResult!,
            onDone: () => ref.read(gachaNotifierProvider.notifier).finishReveal(),
          ),
      },
    );
  }
}

// ── Idle view ─────────────────────────────────────────────────────────────────

class _IdleView extends ConsumerWidget {
  const _IdleView({required this.state});
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
              _BannerSection(),
              const SizedBox(height: 32),
              _PullButtons(
                crystals: state.crystals,
                onSinglePull: () => notifier.pull(count: 1),
                onTenPull: () => notifier.pull(count: 10),
              ),
              const SizedBox(height: 16),
              _RatesCard(),
              const SizedBox(height: 24),
            ],
          ),
        ),
        if (state.history.isNotEmpty) ...[
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 12),
              child: Text(
                'RECENT SUMMONS',
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

// ── Banner ────────────────────────────────────────────────────────────────────

class _BannerSection extends StatelessWidget {
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
                const Offset(20, 20), const Offset(80, 50), const Offset(140, 15),
                const Offset(200, 60), const Offset(260, 25), const Offset(300, 55),
                const Offset(50, 100), const Offset(220, 110),
              ];
              return Positioned(
                left: positions[i].dx,
                top: positions[i].dy,
                child: Text(
                  '✦',
                  style: TextStyle(
                    color: EidolonColors.gold.withValues(alpha: 0.3 + (i % 3) * 0.1),
                    fontSize: 12 + (i % 3) * 4.0,
                  ),
                )
                    .animate(onPlay: (c) => c.repeat(reverse: true))
                    .fadeIn(duration: Duration(milliseconds: 800 + i * 200))
                    .then()
                    .fadeOut(duration: Duration(milliseconds: 800 + i * 200)),
              );
            }),
            // Content
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '🌀',
                    style: const TextStyle(fontSize: 48),
                  )
                      .animate(onPlay: (c) => c.repeat(reverse: true))
                      .scaleXY(begin: 0.95, end: 1.05, duration: 2.seconds)
                      .rotate(begin: -0.02, end: 0.02, duration: 3.seconds),
                  const SizedBox(height: 8),
                  Text(
                    'SOUL SUMMON',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          letterSpacing: 4,
                          color: EidolonColors.accentGlow,
                        ),
                  ),
                  Text(
                    'Discover fragments of your soul',
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

// ── Pull buttons ──────────────────────────────────────────────────────────────

class _PullButtons extends StatelessWidget {
  const _PullButtons({
    required this.crystals,
    required this.onSinglePull,
    required this.onTenPull,
  });

  final int crystals;
  final VoidCallback onSinglePull;
  final VoidCallback onTenPull;

  @override
  Widget build(BuildContext context) {
    final canSingle = crystals >= kSinglePullCost;
    final canTen = crystals >= kTenPullCost;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          // 10-pull (primary)
          SizedBox(
            width: double.infinity,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                boxShadow: canTen
                    ? [
                        BoxShadow(
                          color: EidolonColors.accent.withValues(alpha: 0.4),
                          blurRadius: 20,
                          spreadRadius: 1,
                        ),
                      ]
                    : null,
              ),
              child: ElevatedButton(
                onPressed: canTen ? onTenPull : null,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('💎', style: TextStyle(fontSize: 16)),
                    const SizedBox(width: 8),
                    Text(
                      '$kTenPullCost  ×10 Summon',
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            color: Colors.white,
                            letterSpacing: 1,
                          ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),
          // Single pull
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: canSingle ? onSinglePull : null,
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('💎', style: TextStyle(fontSize: 14)),
                  const SizedBox(width: 8),
                  Text(
                    '$kSinglePullCost  ×1 Summon',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          letterSpacing: 1,
                        ),
                  ),
                ],
              ),
            ),
          ),
          if (!canSingle)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                'You need at least $kSinglePullCost 💎 to summon.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: EidolonColors.warning,
                    ),
              ),
            ),
        ],
      ),
    );
  }
}

// ── Rates card ────────────────────────────────────────────────────────────────

class _RatesCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: EidolonColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: EidolonColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'SUMMON RATES',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    letterSpacing: 1.5,
                  ),
            ),
            const SizedBox(height: 12),
            ...GachaRarity.values.reversed.map(
              (r) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: GachaCard.rarityColor(r),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      r.label,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: GachaCard.rarityColor(r),
                          ),
                    ),
                    const Spacer(),
                    Text(
                      '${(r.weight / 100).toStringAsFixed(1)}%',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Pulling animation ─────────────────────────────────────────────────────────

class _PullingView extends StatelessWidget {
  const _PullingView();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '🌀',
            style: const TextStyle(fontSize: 72),
          )
              .animate(onPlay: (c) => c.repeat())
              .rotate(duration: 1.5.seconds, curve: Curves.linear)
              .scaleXY(
                begin: 0.9,
                end: 1.1,
                duration: 800.ms,
                curve: Curves.easeInOut,
              ),
          const SizedBox(height: 32),
          Text(
            'Summoning…',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: EidolonColors.accentGlow,
                ),
          ).animate(onPlay: (c) => c.repeat(reverse: true)).fadeIn(duration: 600.ms),
        ],
      ),
    );
  }
}

// ── Reveal view ───────────────────────────────────────────────────────────────

class _RevealView extends StatelessWidget {
  const _RevealView({required this.result, required this.onDone});
  final GachaPullResult result;
  final VoidCallback onDone;

  @override
  Widget build(BuildContext context) {
    final items = result.items;
    final isSingle = items.length == 1;

    return Column(
      children: [
        const SizedBox(height: 16),
        // Rarity badge for single pull
        if (isSingle)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            decoration: BoxDecoration(
              color: GachaCard.rarityColor(items.first.rarity).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: GachaCard.rarityColor(items.first.rarity).withValues(alpha: 0.5),
              ),
            ),
            child: Text(
              items.first.rarity.label.toUpperCase(),
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: GachaCard.rarityColor(items.first.rarity),
                    letterSpacing: 2,
                  ),
            ),
          )
              .animate()
              .fadeIn(duration: 500.ms, delay: 300.ms)
              .scaleXY(begin: 0.8, end: 1.0, curve: Curves.elasticOut),

        const SizedBox(height: 16),

        // Cards grid
        Expanded(
          child: isSingle
              ? Center(child: GachaCard(item: items.first, index: 0))
              : Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: GridView.builder(
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 5,
                      childAspectRatio: 0.75,
                      crossAxisSpacing: 8,
                      mainAxisSpacing: 8,
                    ),
                    itemCount: items.length,
                    itemBuilder: (ctx, i) =>
                        GachaCard(item: items[i], index: i),
                  ),
                ),
        ),

        // Tap to continue
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 40),
          child: SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: onDone,
              child: const Text('Continue'),
            ),
          )
              .animate(delay: Duration(milliseconds: 120 * items.length + 600))
              .fadeIn(duration: 400.ms)
              .slideY(begin: 0.3, end: 0),
        ),
      ],
    );
  }
}
