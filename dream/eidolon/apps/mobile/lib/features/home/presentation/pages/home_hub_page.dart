import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/auth/presentation/providers/auth_provider.dart';
import 'package:eidolon/features/home/domain/entities/home_summary.dart';
import 'package:eidolon/features/home/presentation/providers/home_provider.dart';
import 'package:eidolon/features/reality_sync/presentation/widgets/reality_sync_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_types/shared_types.dart';

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
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(homeNotifierProvider);

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
              SliverToBoxAdapter(child: _GreetingHeader(state: state)),
              SliverToBoxAdapter(child: _EidolonCard(eidolon: state.eidolon)),
              if (state.summary?.hasActiveRun == true)
                SliverToBoxAdapter(
                  child: _ActiveRunBanner(
                    activeRunId: state.summary!.activeRunId,
                  ),
                ),
              SliverToBoxAdapter(child: _DailyStats(summary: state.summary)),
              SliverToBoxAdapter(child: _QuickActions()),
              const SliverToBoxAdapter(child: RealitySyncCard()),
              if (state.errorMessage != null)
                SliverToBoxAdapter(
                  child: _ErrorBanner(
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

// ── Greeting ──────────────────────────────────────────────────────────────────

class _GreetingHeader extends StatelessWidget {
  const _GreetingHeader({required this.state});
  final HomeState state;

  String get _greeting {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  Widget build(BuildContext context) {
    final name = state.player?.displayNameOrUsername ?? 'Adventurer';
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$_greeting,',
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
            _StreakBadge(streak: state.summary!.currentStreak),
        ],
      ),
    );
  }
}

class _StreakBadge extends StatelessWidget {
  const _StreakBadge({required this.streak});
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

// ── Eidolon card ──────────────────────────────────────────────────────────────

class _EidolonCard extends StatelessWidget {
  const _EidolonCard({required this.eidolon});
  final EidolonProfile? eidolon;

  static const _moodLabels = {
    EidolonMood.calm: 'Calm',
    EidolonMood.excited: 'Excited',
    EidolonMood.anxious: 'Anxious',
    EidolonMood.tired: 'Tired',
    EidolonMood.focused: 'Focused',
    EidolonMood.melancholic: 'Melancholic',
  };

  static const _moodIcons = {
    EidolonMood.calm: '🌊',
    EidolonMood.excited: '⚡',
    EidolonMood.anxious: '🌀',
    EidolonMood.tired: '😴',
    EidolonMood.focused: '🎯',
    EidolonMood.melancholic: '🌧️',
  };

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: _CardShell(
        child: eidolon == null
            ? Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text(
                  'Eidolon not yet awakened',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: EidolonColors.textSecondary,
                      ),
                ),
              )
            : _EidolonCardContent(
                eidolon: eidolon!,
                moodLabels: _moodLabels,
                moodIcons: _moodIcons,
              ),
      ),
    );
  }
}

class _EidolonCardContent extends StatelessWidget {
  const _EidolonCardContent({
    required this.eidolon,
    required this.moodLabels,
    required this.moodIcons,
  });

  final EidolonProfile eidolon;
  final Map<EidolonMood, String> moodLabels;
  final Map<EidolonMood, String> moodIcons;

  @override
  Widget build(BuildContext context) {
    final mood = eidolon.currentMood;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                eidolon.name,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      color: EidolonColors.textPrimary,
                      fontWeight: FontWeight.bold,
                    ),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: EidolonColors.background,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: EidolonColors.accent.withValues(alpha: 0.4),
                ),
              ),
              child: Text(
                'Lv. ${eidolon.level}',
                style: const TextStyle(
                  color: EidolonColors.accent,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Text(
              moodIcons[mood] ?? '✨',
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(width: 6),
            Text(
              moodLabels[mood] ?? 'Unknown',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: EidolonColors.textSecondary,
                  ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'XP',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: EidolonColors.textSecondary,
                  ),
            ),
            Text(
              '${eidolon.xp} / ${eidolon.xpToNext}',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: EidolonColors.textSecondary,
                  ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: eidolon.levelProgress.clamp(0.0, 1.0),
            backgroundColor: EidolonColors.background,
            valueColor:
                const AlwaysStoppedAnimation<Color>(EidolonColors.accent),
            minHeight: 6,
          ),
        ),
      ],
    );
  }
}

// ── Active run banner ─────────────────────────────────────────────────────────

class _ActiveRunBanner extends StatelessWidget {
  const _ActiveRunBanner({required this.activeRunId});
  final String? activeRunId;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: GestureDetector(
        onTap: () => context.go('/dungeon'),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                const Color(0xFFCC2222).withValues(alpha: 0.3),
                const Color(0xFF881111).withValues(alpha: 0.2),
              ],
            ),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: const Color(0xFFCC2222).withValues(alpha: 0.5),
            ),
          ),
          child: Row(
            children: [
              const Icon(
                Icons.warning_amber_rounded,
                color: Color(0xFFFF6666),
                size: 20,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Active dungeon run in progress — tap to return',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: const Color(0xFFFF9999),
                      ),
                ),
              ),
              const Icon(
                Icons.arrow_forward_ios,
                color: Color(0xFFFF6666),
                size: 14,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Daily stats ───────────────────────────────────────────────────────────────

class _DailyStats extends StatelessWidget {
  const _DailyStats({required this.summary});
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
                child: _StatTile(
                  icon: Icons.castle_outlined,
                  label: 'Runs Today',
                  value: '$runs / 5',
                  color: EidolonColors.accent,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatTile(
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

class _StatTile extends StatelessWidget {
  const _StatTile({
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

// ── Quick actions ─────────────────────────────────────────────────────────────

class _QuickActions extends StatelessWidget {
  const _QuickActions();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'QUICK ACTIONS',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: EidolonColors.textSecondary,
                  letterSpacing: 1.5,
                ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _ActionCard(
                  icon: Icons.castle_outlined,
                  label: 'Enter Dungeon',
                  gradientColors: const [Color(0xFF4A1A7A), Color(0xFF2D0D5A)],
                  borderColor: EidolonColors.accent,
                  onTap: () => context.go('/dungeon'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _ActionCard(
                  icon: Icons.chat_bubble_outline,
                  label: 'Talk with Eidolon',
                  gradientColors: const [Color(0xFF1A3A4A), Color(0xFF0D2535)],
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

class _ActionCard extends StatelessWidget {
  const _ActionCard({
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
    return GestureDetector(
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
          border: Border.all(color: borderColor.withValues(alpha: 0.4)),
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
    );
  }
}

// ── Error banner ──────────────────────────────────────────────────────────────

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message, required this.onDismiss});
  final String message;
  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: EidolonColors.error.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: EidolonColors.error.withValues(alpha: 0.4)),
        ),
        child: Row(
          children: [
            const Icon(Icons.error_outline, color: EidolonColors.error, size: 18),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: EidolonColors.error,
                    ),
              ),
            ),
            GestureDetector(
              onTap: onDismiss,
              child: const Icon(
                Icons.close,
                color: EidolonColors.error,
                size: 16,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Shared card shell ─────────────────────────────────────────────────────────

class _CardShell extends StatelessWidget {
  const _CardShell({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: EidolonColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: EidolonColors.accent.withValues(alpha: 0.15),
        ),
      ),
      child: child,
    );
  }
}
