import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/away_report/presentation/away_report_provider.dart';
import 'package:eidolon/features/eidolon/presentation/providers/eidolon_provider.dart';
import 'package:eidolon/features/morning_report/presentation/providers/morning_report_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Home-screen prompt to send the Eidolon on an on-demand overnight venture so
/// the player doesn't have to wait for the nightly cron to see a Morning
/// Report. Renders nothing once a run exists for today or an unseen report is
/// already waiting (see [MorningReportState.canDispatch]).
class OvernightDispatchCard extends ConsumerWidget {
  const OvernightDispatchCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(morningReportNotifierProvider);
    final eidolon = ref.watch(
      eidolonNotifierProvider.select((s) => s.eidolon),
    );
    // Don't stack two "Nova adventured" prompts: while an away-reward is waiting
    // to be claimed, let the player deal with that first — the dispatch prompt
    // returns on the next load once the away card is gone.
    final awayClaimable = ref.watch(
          awayReportNotifierProvider.select((s) => s.valueOrNull?.claimable),
        ) ??
        false;
    // Need an awakened Eidolon, and either an idle dispatchable state or an
    // in-flight venture to show the "adventuring…" beat.
    if (eidolon == null ||
        awayClaimable ||
        (!state.canDispatch && !state.isDispatching)) {
      return const SizedBox.shrink();
    }
    final name = eidolon.name;
    final notifier = ref.read(morningReportNotifierProvider.notifier);

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              EidolonColors.accent.withValues(alpha: 0.18),
              EidolonColors.surface,
            ],
          ),
          border: Border.all(
            color: EidolonColors.accentGlow.withValues(alpha: 0.35),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Text('🌙', style: TextStyle(fontSize: 26)),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    context.l10n.overnightDispatchTitle,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: EidolonColors.textPrimary,
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              state.isDispatching
                  ? context.l10n.overnightDispatchInProgress(name)
                  : context.l10n.overnightDispatchBody(name),
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: EidolonColors.textSecondary,
                    height: 1.5,
                  ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: state.isDispatching ? null : notifier.simulateNow,
                style: ElevatedButton.styleFrom(
                  backgroundColor: EidolonColors.accent,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                child: state.isDispatching
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Text(
                        context.l10n.overnightDispatchButton,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ),
            if (!state.isDispatching && state.errorMessage != null) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  const Icon(
                    Icons.error_outline_rounded,
                    color: EidolonColors.error,
                    size: 16,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      context.l10n.overnightDispatchFailed,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: EidolonColors.error,
                          ),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ).animate().fadeIn(duration: 400.ms).slideY(begin: -0.15, end: 0),
    );
  }
}
