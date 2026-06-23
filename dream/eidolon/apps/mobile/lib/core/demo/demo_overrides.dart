import 'dart:math';

import 'package:eidolon/features/auth/domain/entities/auth_user.dart';
import 'package:eidolon/features/auth/presentation/providers/auth_provider.dart';
import 'package:eidolon/features/dungeon/domain/entities/dungeon_run.dart';
import 'package:eidolon/features/dungeon/presentation/providers/dungeon_provider.dart';
import 'package:eidolon/features/eidolon/domain/entities/chat_message.dart';
import 'package:eidolon/features/eidolon/presentation/providers/eidolon_provider.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_item.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_pull_result.dart';
import 'package:eidolon/features/gacha/domain/repositories/gacha_repository.dart';
import 'package:eidolon/features/gacha/presentation/providers/gacha_provider.dart';
import 'package:eidolon/features/home/domain/entities/home_summary.dart';
import 'package:eidolon/features/home/presentation/providers/home_provider.dart';
import 'package:eidolon/features/morning_report/domain/entities/morning_report.dart';
import 'package:eidolon/features/morning_report/presentation/providers/morning_report_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_types/shared_types.dart';

/// Provider overrides that turn the app into a self-contained, backend-free
/// DEMO. Wired in `main.dart` only when [AppEnv.isDemoMode] is true (i.e. no
/// real Firebase/Supabase credentials were injected). Production builds never
/// reach this code.
///
/// Each fake mirrors the test-fake pattern: extend the real notifier and
/// override `build()` to return fixed sample state, bypassing all backend
/// use cases.
List<Override> demoOverrides() => [
      authNotifierProvider.overrideWith(_DemoAuthNotifier.new),
      homeNotifierProvider.overrideWith(_DemoHomeNotifier.new),
      gachaNotifierProvider.overrideWith(_DemoGachaNotifier.new),
      eidolonNotifierProvider.overrideWith(_DemoEidolonNotifier.new),
      morningReportNotifierProvider.overrideWith(_DemoMorningReportNotifier.new),
      dungeonNotifierProvider.overrideWith(_DemoDungeonNotifier.new),
    ];

// ── Sample data ───────────────────────────────────────────────────────────────

final _now = DateTime(2026, 6, 14);

const _demoUser = AuthUser(
  uid: 'demo-uid',
  email: 'demo@eidolon.app',
  displayName: 'Kai',
);

final _demoPlayer = PlayerProfile(
  id: 'demo-player',
  authUid: 'demo-uid',
  username: 'Kai',
  displayName: 'Kai',
  createdAt: _now,
  lastActive: _now,
);

final _demoEidolon = EidolonProfile(
  id: 'demo-eidolon',
  userId: 'demo-player',
  name: 'Lyra',
  level: 7,
  xp: 640,
  xpToNext: 1000,
  currentMood: EidolonMood.focused,
  personality: const PersonalityProfile(
    openness: 78,
    conscientiousness: 64,
    extraversion: 41,
    agreeableness: 70,
    neuroticism: 33,
  ),
  createdAt: _now,
  updatedAt: _now,
);

const _demoSummary = HomeSummary(
  dungeonRunsToday: 2,
  currentStreak: 14,
  hasActiveRun: false,
);

const _demoBundles = [
  CrystalBundle(
    productId: 'demo.80',
    crystals: 80,
    displayPrice: '\$0.99',
    isBestValue: false,
  ),
  CrystalBundle(
    productId: 'demo.500',
    crystals: 500,
    displayPrice: '\$4.99',
    isBestValue: false,
  ),
  CrystalBundle(
    productId: 'demo.1800',
    crystals: 1800,
    displayPrice: '\$14.99',
    isBestValue: false,
  ),
  CrystalBundle(
    productId: 'demo.5000',
    crystals: 5000,
    displayPrice: '\$39.99',
    isBestValue: true,
  ),
];

// ── Fake notifiers ──────────────────────────────────────────────────────────────

class _DemoAuthNotifier extends AuthNotifier {
  /// The demo normally lands authenticated (straight into the app), but the
  /// entry flows can be previewed with ?demo=login or ?demo=onboarding.
  @override
  AuthState build() {
    final mode = Uri.base.queryParameters['demo'];
    return switch (mode) {
      'login' => const AuthState(status: AuthStatus.unauthenticated),
      'onboarding' => const AuthState(
          status: AuthStatus.onboardingRequired,
          user: _demoUser,
        ),
      _ => const AuthState(status: AuthStatus.authenticated, user: _demoUser),
    };
  }

  @override
  Future<void> signOut() async {}

  @override
  Future<void> deleteAccount() async {}
}

class _DemoHomeNotifier extends HomeNotifier {
  @override
  HomeState build() => HomeState(
        player: _demoPlayer,
        eidolon: _demoEidolon,
        summary: _demoSummary,
      );

  @override
  Future<void> load(String authUid) async {}

  @override
  void clearError() => state = state.copyWith(errorMessage: null);
}

class _DemoEidolonNotifier extends EidolonNotifier {
  var _counter = 0;

  @override
  EidolonState build() => EidolonState(
        eidolon: _demoEidolon,
        messages: [
          ChatMessage(
            id: 'm1',
            text: 'You came back. I felt the distance close.',
            isFromEidolon: true,
            timestamp: _now.add(const Duration(minutes: -8)),
          ),
          ChatMessage(
            id: 'm2',
            text:
                'I walked the forest while you slept — and I kept a fragment for you.',
            isFromEidolon: true,
            timestamp: _now.add(const Duration(minutes: -7)),
          ),
        ],
      );

  @override
  Future<void> loadEidolon() async {}

  @override
  Future<void> sendMessage(String text) async {
    final now = DateTime.now();
    state = state.copyWith(
      messages: [
        ...state.messages,
        ChatMessage(
          id: 'u${_counter++}',
          text: text,
          isFromEidolon: false,
          timestamp: now,
        ),
      ],
      isSending: true,
    );
    await Future<void>.delayed(const Duration(milliseconds: 700));
    state = state.copyWith(
      isSending: false,
      messages: [
        ...state.messages,
        ChatMessage(
          id: 'e${_counter++}',
          text: 'I hear you. (This is a demo reply — connect a backend for '
              'real AI dialogue.)',
          isFromEidolon: true,
          timestamp: DateTime.now(),
        ),
      ],
    );
  }

  @override
  void clearError() => state = state.copyWith(errorMessage: null);
}

class _DemoGachaNotifier extends GachaNotifier {
  final _rng = Random();

  @override
  GachaState build() => const GachaState(
        crystals: 1600,
        bundles: _demoBundles,
      );

  /// Local roll — no backend. Picks weighted-random items from the canonical
  /// catalog so the reveal animation can be demoed end to end.
  @override
  Future<void> pull({required int count}) async {
    final cost = count == 1 ? kSinglePullCost : kTenPullCost;
    if (state.crystals < cost) return;

    state = state.copyWith(phase: GachaPhase.pulling);
    await Future<void>.delayed(const Duration(milliseconds: 900));

    final items = List.generate(count, (_) => _rollItem());
    state = state.copyWith(
      phase: GachaPhase.revealing,
      crystals: state.crystals - cost,
      lastResult: GachaPullResult(
        items: items,
        pulledAt: DateTime.now(),
        crystalsSpent: cost,
      ),
      history: [...items, ...state.history].take(30).toList(),
    );
  }

  @override
  Future<void> buyCrystals(String productId) async {
    final bundle = _demoBundles.firstWhere(
      (b) => b.productId == productId,
      orElse: () => _demoBundles.first,
    );
    state = state.copyWith(crystals: state.crystals + bundle.crystals);
  }

  // Showcase odds (DEMO ONLY): the real GachaNotifier uses the true rates
  // (legendary ~1%). Here we bias high so a reviewer reliably sees every
  // rarity's reveal — including the Legendary spectacle — without grinding.
  static const _demoWeights = {
    GachaRarity.common: 35,
    GachaRarity.rare: 30,
    GachaRarity.epic: 22,
    GachaRarity.legendary: 13,
  };

  GachaItem _rollItem() {
    final roll = _rng.nextInt(100);
    var cumulative = 0;
    var rarity = GachaRarity.common;
    for (final r in GachaRarity.values.reversed) {
      cumulative += _demoWeights[r]!;
      if (roll < cumulative) {
        rarity = r;
        break;
      }
    }
    final pool = kGachaCatalog.where((i) => i.rarity == rarity).toList();
    return pool[_rng.nextInt(pool.length)];
  }
}

class _DemoMorningReportNotifier extends MorningReportNotifier {
  /// Start dispatchable (no run yet) so the on-demand "send Nova off" prompt is
  /// visible in the demo.
  @override
  MorningReportState build() => const MorningReportState();

  @override
  Future<void> refresh() async {}

  @override
  Future<void> loadLatest() async {}

  /// Fake the round-trip: a brief "venturing…" beat, then a sample report so
  /// the Morning Report card takes over from the dispatch prompt.
  @override
  Future<void> simulateNow() async {
    state = state.copyWith(isDispatching: true);
    await Future<void>.delayed(const Duration(milliseconds: 900));
    state = state.copyWith(
      isDispatching: false,
      todayRunExists: true,
      report: MorningReport(
        id: 'demo-run',
        runDate: DateTime(2026, 6, 22),
        theme: 'forest',
        narrative:
            'Under a bruised-violet sky, Lyra slipped between the glowing '
            'fungi of the old forest, trading riddles with a shrine-spirit and '
            'coaxing a sliver of moonlight into her satchel.',
        highlight: 'Lyra outwitted a shrine-spirit and pocketed moonlight.',
        mood: EidolonMood.focused,
        xpGained: 120,
        loot: const [
          OvernightLoot(name: 'Sliver of Moonlight', rarity: LootRarity.epic),
        ],
        seen: false,
      ),
    );
  }
}

/// Runs the whole dungeon loop locally — generate → battle each room → result —
/// with no Edge Function, so the demo doesn't hang on "drawing the dungeon…".
/// Mirrors the real reward math but skips all backend persistence.
class _DemoDungeonNotifier extends DungeonNotifier {
  @override
  Future<void> checkForActiveRun(String eidolonId) async {
    state = state.copyWith(phase: DungeonPhase.hub, isLoading: false);
  }

  @override
  Future<void> generateAndStart(String eidolonId) async {
    state = state.copyWith(phase: DungeonPhase.generating, errorMessage: null);
    await Future<void>.delayed(const Duration(milliseconds: 700));
    final now = DateTime.now();
    final theme = state.selectedTheme ?? DungeonTheme.forest;
    final dungeon = Dungeon(
      id: 'demo-dungeon-${now.microsecondsSinceEpoch}',
      theme: theme,
      difficulty: state.selectedDifficulty,
      name: 'デモダンジョン',
      narrativeIntro: 'サンプルの冒険です。実際の冒険ではAIが毎回物語を描きます。',
      rooms: const [
        DungeonRoom(index: 0, description: '影が蠢く回廊', eventType: 'combat'),
        DungeonRoom(index: 1, description: '苔むした広間', eventType: 'combat'),
        DungeonRoom(index: 2, description: '守護者の間', eventType: 'boss'),
      ],
      createdAt: now,
      expiresAt: now.add(const Duration(days: 1)),
    );
    state = state.copyWith(
      phase: DungeonPhase.run,
      dungeon: dungeon,
      run: DungeonRun(
        id: 'demo-run-${now.microsecondsSinceEpoch}',
        eidolonId: eidolonId,
        dungeonId: dungeon.id,
        startedAt: now,
      ),
      crystalsEarned: 0,
      xpEarned: 0,
      levelsGained: 0,
      awaitingNext: false,
      errorMessage: null,
    );
  }

  @override
  void onBattleResult(bool victory) {
    final run = state.run;
    final dungeon = state.dungeon;
    if (run == null || dungeon == null || state.awaitingNext) return;
    if (!victory) {
      state = state.copyWith(
        phase: DungeonPhase.result,
        run: run.copyWith(status: RunStatus.failed),
        isLoading: false,
      );
      return;
    }
    final idx = run.currentRoom;
    final isLast = idx >= dungeon.rooms.length - 1;
    final d = state.selectedDifficulty;
    final crystals = 4 + d * 2 + idx + (isLast ? d * 3 : 0);
    final xp = 12 + d * 6 + idx * 4 + (isLast ? d * 8 : 0);
    state = state.copyWith(
      crystalsEarned: state.crystalsEarned + crystals,
      xpEarned: state.xpEarned + xp,
      awaitingNext: true,
    );
  }

  @override
  Future<void> advanceRoom() async {
    final run = state.run;
    final dungeon = state.dungeon;
    if (run == null || dungeon == null) return;
    if (run.currentRoom >= dungeon.rooms.length - 1) {
      state = state.copyWith(
        phase: DungeonPhase.result,
        run: run.copyWith(status: RunStatus.completed),
      );
      return;
    }
    state = state.copyWith(run: run.copyWith(currentRoom: run.currentRoom + 1));
  }

  @override
  Future<void> abandonRun() async {
    final run = state.run;
    state = state.copyWith(
      phase: DungeonPhase.result,
      run: run?.copyWith(status: RunStatus.abandoned),
    );
  }

  @override
  Future<void> retry(String eidolonId) async {
    state = state.copyWith(
      phase: DungeonPhase.hub,
      dungeon: null,
      run: null,
      crystalsEarned: 0,
      xpEarned: 0,
      levelsGained: 0,
      awaitingNext: false,
    );
    await generateAndStart(eidolonId);
  }
}
