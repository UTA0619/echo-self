import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/gacha/presentation/providers/gacha_provider.dart';
import 'package:eidolon/features/gacha/presentation/widgets/crystal_counter.dart';
import 'package:eidolon/features/gacha/presentation/widgets/gacha_idle_view.dart';
import 'package:eidolon/features/gacha/presentation/widgets/gacha_reveal_view.dart';
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
        title: Text(context.l10n.gachaTitle, style: Theme.of(context).textTheme.titleMedium),
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
        GachaPhase.idle || GachaPhase.done => GachaIdleView(state: state),
        GachaPhase.pulling => const _PullingView(),
        GachaPhase.revealing => GachaRevealView(
            result: state.lastResult!,
            onDone: () =>
                ref.read(gachaNotifierProvider.notifier).finishReveal(),
          ),
      },
    );
  }
}

// ── Pulling animation (local — too small to warrant its own file) ─────────────

class _PullingView extends StatelessWidget {
  const _PullingView();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('🌀', style: TextStyle(fontSize: 72))
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
          ).animate(onPlay: (c) => c.repeat(reverse: true)).fadeIn(
                duration: 600.ms,
              ),
        ],
      ),
    );
  }
}
