import 'dart:math';

import 'package:eidolon/features/auth/domain/entities/auth_user.dart';
import 'package:eidolon/features/auth/presentation/providers/auth_provider.dart';
import 'package:eidolon/features/eidolon/domain/entities/chat_message.dart';
import 'package:eidolon/features/eidolon/presentation/providers/eidolon_provider.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_item.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_pull_result.dart';
import 'package:eidolon/features/gacha/domain/repositories/gacha_repository.dart';
import 'package:eidolon/features/gacha/presentation/providers/gacha_provider.dart';
import 'package:eidolon/features/home/domain/entities/home_summary.dart';
import 'package:eidolon/features/home/presentation/providers/home_provider.dart';
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

  GachaItem _rollItem() {
    final roll = _rng.nextInt(10000);
    var cumulative = 0;
    var rarity = GachaRarity.common;
    for (final r in GachaRarity.values.reversed) {
      cumulative += r.weight;
      if (roll < cumulative) {
        rarity = r;
        break;
      }
    }
    final pool = kGachaCatalog.where((i) => i.rarity == rarity).toList();
    return pool[_rng.nextInt(pool.length)];
  }
}
