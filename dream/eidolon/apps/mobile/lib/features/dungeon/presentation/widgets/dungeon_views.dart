import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/dungeon/presentation/providers/dungeon_provider.dart';
import 'package:eidolon/features/dungeon/presentation/widgets/difficulty_selector.dart';
import 'package:eidolon/features/dungeon/presentation/widgets/dungeon_room_card.dart';
import 'package:eidolon/features/eidolon/presentation/providers/eidolon_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_types/shared_types.dart';

/// Localized display name for a dungeon theme. Avoids leaking raw enum names
/// (e.g. "oceanDepth", "void_") into the UI.
String _themeLabel(BuildContext context, DungeonTheme t) => switch (t) {
      DungeonTheme.forest => context.l10n.dungeonThemeForest,
      DungeonTheme.cave => context.l10n.dungeonThemeCave,
      DungeonTheme.ruins => context.l10n.dungeonThemeRuins,
      DungeonTheme.void_ => context.l10n.dungeonThemeVoid,
      DungeonTheme.oceanDepth => context.l10n.dungeonThemeOceanDepth,
      DungeonTheme.skyCitadel => context.l10n.dungeonThemeSkyCitadel,
      DungeonTheme.shadowRealm => context.l10n.dungeonThemeShadowRealm,
      DungeonTheme.crystalMaze => context.l10n.dungeonThemeCrystalMaze,
    };

/// Localized difficulty name for a tier (1/3/5/7/10).
String _difficultyLabel(BuildContext context, int tier) => switch (tier) {
      1 => context.l10n.dungeonDifficultyNovice,
      3 => context.l10n.dungeonDifficultyAdept,
      5 => context.l10n.dungeonDifficultyExpert,
      7 => context.l10n.dungeonDifficultyMaster,
      _ => context.l10n.dungeonDifficultyVoid,
    };

// ── Hub: Choose difficulty + theme, then generate ─────────────────────────────

class DungeonHubView extends ConsumerWidget {
  const DungeonHubView({super.key, required this.state});
  final DungeonState state;

  static const _themes = DungeonTheme.values;
  static const _themeEmojis = {
    DungeonTheme.forest: '🌲',
    DungeonTheme.cave: '🪨',
    DungeonTheme.ruins: '🏛',
    DungeonTheme.void_: '🌑',
    DungeonTheme.oceanDepth: '🌊',
    DungeonTheme.skyCitadel: '☁️',
    DungeonTheme.shadowRealm: '🌒',
    DungeonTheme.crystalMaze: '💎',
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(dungeonNotifierProvider.notifier);
    final eidolonId = ref.watch(
      eidolonNotifierProvider.select((s) => s.eidolon?.id),
    );

    return Column(
      children: [
        // Title bar
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 8),
          child: Row(
            children: [
              Text(
                context.l10n.homeTabDungeon,
                style: Theme.of(context).textTheme.displaySmall,
              ).animate().fadeIn(duration: 400.ms),
              const Spacer(),
              if (state.errorMessage != null)
                GestureDetector(
                  onTap: notifier.clearError,
                  child: const Icon(
                    Icons.error_outline,
                    color: EidolonColors.error,
                  ),
                ),
            ],
          ),
        ),

        if (state.errorMessage != null)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              state.errorMessage!,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: EidolonColors.error,
                  ),
            ),
          ),

        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 8),

                DifficultySelector(
                  value: state.selectedDifficulty,
                  onChanged: notifier.setDifficulty,
                ).animate(delay: 100.ms).fadeIn(),

                const SizedBox(height: 24),

                Text(
                  context.l10n.dungeonTheme,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: EidolonColors.textSecondary,
                      ),
                ),
                const SizedBox(height: 8),

                // Theme grid
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _themes.map((t) {
                    final selected = state.selectedTheme == t;
                    final emoji = _themeEmojis[t] ?? '✨';
                    final label = _themeLabel(context, t);
                    return GestureDetector(
                      onTap: () => notifier.setTheme(selected ? null : t),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          color: selected
                              ? EidolonColors.accent.withValues(alpha: 0.2)
                              : EidolonColors.surfaceElevated,
                          border: Border.all(
                            color: selected
                                ? EidolonColors.accent
                                : EidolonColors.border,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(emoji),
                            const SizedBox(width: 6),
                            Text(
                              label,
                              style: Theme.of(context)
                                  .textTheme
                                  .labelMedium
                                  ?.copyWith(
                                    color: selected
                                        ? EidolonColors.accent
                                        : EidolonColors.textSecondary,
                                  ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ).animate(delay: 200.ms).fadeIn(),

                const SizedBox(height: 16),

                if (state.selectedTheme == null)
                  Text(
                    context.l10n.dungeonNoThemeSelected,
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: EidolonColors.textSecondary,
                          fontStyle: FontStyle.italic,
                        ),
                  ),

                const SizedBox(height: 24),

                // Expedition preview — reflects the current selection and
                // gives the otherwise-empty mid-section purpose.
                _ExpeditionPreview(
                  difficulty: state.selectedDifficulty,
                  theme: state.selectedTheme,
                ).animate(delay: 250.ms).fadeIn(),
              ],
            ),
          ),
        ),

        // Enter dungeon button (+ explanatory hint when it can't be used)
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
          child: Column(
            children: [
              if (eidolonId == null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.info_outline_rounded,
                        size: 16,
                        color: EidolonColors.warning,
                      ),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          context.l10n.dungeonNoEidolonHint,
                          style:
                              Theme.of(context).textTheme.labelSmall?.copyWith(
                                    color: EidolonColors.warning,
                                  ),
                        ),
                      ),
                    ],
                  ),
                ),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: eidolonId != null
                      ? () => notifier.generateAndStart(eidolonId)
                      : null,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 18),
                    backgroundColor: EidolonColors.accent,
                    disabledBackgroundColor:
                        EidolonColors.surfaceElevated,
                  ),
                  child: Text(
                    context.l10n.dungeonEnter,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: Colors.white,
                          letterSpacing: 1.5,
                        ),
                  ),
                ),
              ),
            ],
          ).animate(delay: 300.ms).fadeIn().slideY(begin: 0.3, end: 0),
        ),
      ],
    );
  }
}

/// Compact summary of the chosen difficulty + theme, shown on the dungeon hub
/// so the configuration has visible consequence before launching.
class _ExpeditionPreview extends StatelessWidget {
  const _ExpeditionPreview({required this.difficulty, this.theme});

  final int difficulty;
  final DungeonTheme? theme;

  @override
  Widget build(BuildContext context) {
    final themeText =
        theme == null ? context.l10n.dungeonThemeRandom : _themeLabel(context, theme!);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: EidolonColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: EidolonColors.accent.withValues(alpha: 0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            context.l10n.dungeonExpedition.toUpperCase(),
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: EidolonColors.textSecondary,
                  letterSpacing: 1.5,
                ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _PreviewStat(
                  label: context.l10n.dungeonDifficulty,
                  value: '$difficulty · ${_difficultyLabel(context, difficulty)}',
                ),
              ),
              Container(
                width: 1,
                height: 32,
                color: EidolonColors.border,
              ),
              Expanded(
                child: _PreviewStat(
                  label: context.l10n.dungeonTheme,
                  value: themeText,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _PreviewStat extends StatelessWidget {
  const _PreviewStat({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: EidolonColors.textSecondary,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  color: EidolonColors.textPrimary,
                  fontWeight: FontWeight.w600,
                ),
          ),
        ],
      ),
    );
  }
}

// ── Generating: spinner while AI builds the dungeon ──────────────────────────

class DungeonGeneratingView extends StatelessWidget {
  const DungeonGeneratingView({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(color: EidolonColors.accent),
          const SizedBox(height: 24),
          Text(
            context.l10n.dungeonGenerating,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: EidolonColors.textSecondary,
                ),
          ),
        ],
      ).animate().fadeIn(duration: 400.ms),
    );
  }
}

// ── Run: show current room with advance/abandon ───────────────────────────────

class DungeonRunView extends ConsumerWidget {
  const DungeonRunView({super.key, required this.state});
  final DungeonState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dungeon = state.dungeon;
    final run = state.run;
    if (dungeon == null || run == null) return const SizedBox.shrink();

    final rooms = dungeon.rooms;
    final currentIdx = run.currentRoom.clamp(0, rooms.length - 1);
    final room = rooms[currentIdx];
    final notifier = ref.read(dungeonNotifierProvider.notifier);
    final isLast = currentIdx >= rooms.length - 1;

    return Column(
      children: [
        // Top bar
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 8),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      dungeon.name,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: EidolonColors.accentGlow,
                          ),
                    ),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(3),
                      child: LinearProgressIndicator(
                        value: (currentIdx + 1) / rooms.length,
                        minHeight: 4,
                        backgroundColor: EidolonColors.border,
                        color: EidolonColors.accent,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              TextButton(
                onPressed: notifier.abandonRun,
                child: Text(
                  context.l10n.dungeonAbandon,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: EidolonColors.error,
                      ),
                ),
              ),
            ],
          ),
        ),

        // Narrative intro (first room only)
        if (currentIdx == 0)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
            child: Text(
              dungeon.narrativeIntro,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: EidolonColors.textSecondary,
                    fontStyle: FontStyle.italic,
                    height: 1.6,
                  ),
            ).animate().fadeIn(duration: 600.ms),
          ),

        // Room card
        Expanded(
          child: Center(
            child: DungeonRoomCard(
              room: room,
              roomNumber: currentIdx + 1,
              totalRooms: rooms.length,
            ),
          ),
        ),

        // Action buttons
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
          child: SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: state.isLoading ? null : notifier.advanceRoom,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 18),
              ),
              child: state.isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    )
                  : Text(
                      isLast
                          ? context.l10n.dungeonDefeatBoss
                          : context.l10n.dungeonAdvance,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: Colors.white,
                          ),
                    ),
            ),
          ),
        ),
      ],
    );
  }
}

// ── Result: run complete or abandoned ─────────────────────────────────────────

class DungeonResultView extends ConsumerWidget {
  const DungeonResultView({super.key, required this.state});
  final DungeonState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final run = state.run;
    final isVictory = run?.status == RunStatus.completed;
    final notifier = ref.read(dungeonNotifierProvider.notifier);

    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              isVictory
                  ? context.l10n.dungeonVictory
                  : context.l10n.dungeonRetreated,
              style: Theme.of(context).textTheme.displaySmall,
            ).animate().fadeIn(duration: 500.ms).scaleXY(
                  begin: 0.7,
                  end: 1.0,
                  curve: Curves.elasticOut,
                  duration: 800.ms,
                ),
            const SizedBox(height: 16),
            Text(
              isVictory
                  ? context.l10n.dungeonVictoryBody(
                      state.dungeon?.name ?? context.l10n.dungeonFallbackName,
                    )
                  : context.l10n.dungeonRetreatBody,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: EidolonColors.textSecondary,
                    height: 1.7,
                  ),
            ).animate(delay: 300.ms).fadeIn(),
            const SizedBox(height: 40),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: notifier.backToHub,
                child: Text(context.l10n.buttonReturnToHub),
              ),
            ).animate(delay: 500.ms).fadeIn().slideY(begin: 0.3, end: 0),
          ],
        ),
      ),
    );
  }
}
