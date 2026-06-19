import 'package:eidolon/features/auth/presentation/providers/auth_provider.dart';
import 'package:eidolon/features/daily_reward/presentation/daily_reward_card.dart';
import 'package:eidolon/features/eidolon/presentation/providers/eidolon_provider.dart';
import 'package:eidolon/features/home/presentation/providers/home_provider.dart';
import 'package:eidolon/features/home/presentation/widgets/home_active_run_banner.dart';
import 'package:eidolon/features/home/presentation/widgets/home_daily_stats.dart';
import 'package:eidolon/features/home/presentation/widgets/home_eidolon_card.dart';
import 'package:eidolon/features/home/presentation/widgets/home_error_banner.dart';
import 'package:eidolon/features/home/presentation/widgets/home_greeting_header.dart';
import 'package:eidolon/features/home/presentation/widgets/home_quick_actions.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/morning_report/presentation/providers/morning_report_provider.dart';
import 'package:eidolon/features/morning_report/presentation/widgets/morning_report_card.dart';
import 'package:eidolon/features/reality_sync/presentation/widgets/reality_sync_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class HomeHubPage extends ConsumerStatefulWidget {
  const HomeHubPage({super.key});

  @override
  ConsumerState<HomeHubPage> createState() => _HomeHubPageState();
}

class _HomeHubPageState extends ConsumerState<HomeHubPage> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      final uid = ref.read(authNotifierProvider).user?.uid ?? '';
      if (uid.isNotEmpty) {
        ref.read(homeNotifierProvider.notifier).load(uid);
      }
      // Surface last night's autonomous run, if any.
      ref.read(morningReportNotifierProvider.notifier).loadLatest();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(homeNotifierProvider);
    // Prefer the live Eidolon (mutated by dungeon level-ups) so the card and
    // its avatar reflect progression the instant the player returns home.
    final eidolon = ref.watch(
          eidolonNotifierProvider.select((s) => s.eidolon),
        ) ??
        state.eidolon;

    if (state.isLoading && state.player == null) {
      return const Scaffold(
        backgroundColor: EidolonColors.background,
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      backgroundColor: EidolonColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () {
            final uid = ref.read(authNotifierProvider).user?.uid ?? '';
            return ref.read(homeNotifierProvider.notifier).load(uid);
          },
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(
                child: HomeGreetingHeader(state: state),
              ),
              const SliverToBoxAdapter(child: DailyRewardCard()),
              const SliverToBoxAdapter(child: MorningReportCard()),
              SliverToBoxAdapter(
                child: HomeEidolonCard(eidolon: eidolon),
              ),
              if (state.summary?.hasActiveRun == true)
                SliverToBoxAdapter(
                  child: HomeActiveRunBanner(
                    activeRunId: state.summary!.activeRunId,
                  ),
                ),
              SliverToBoxAdapter(
                child: HomeDailyStats(summary: state.summary),
              ),
              const SliverToBoxAdapter(child: HomeQuickActions()),
              const SliverToBoxAdapter(child: RealitySyncCard()),
              if (state.errorMessage != null)
                SliverToBoxAdapter(
                  child: HomeErrorBanner(
                    message: state.errorMessage!,
                    onDismiss: () =>
                        ref.read(homeNotifierProvider.notifier).clearError(),
                  ),
                ),
              const SliverToBoxAdapter(child: SizedBox(height: 24)),
            ],
          ),
        ),
      ),
    );
  }
}
