import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/auth/domain/entities/auth_user.dart';
import 'package:eidolon/features/auth/presentation/providers/auth_provider.dart';
import 'package:eidolon/features/gacha/data/repositories/gacha_repository_impl.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_item.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_pull_result.dart';
import 'package:eidolon/features/gacha/domain/repositories/gacha_repository.dart';
import 'package:eidolon/features/gacha/presentation/providers/gacha_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

// ── Fakes ─────────────────────────────────────────────────────────────────────

class _FakeAuthNotifier extends AuthNotifier {
  _FakeAuthNotifier(this._state);
  final AuthState _state;

  @override
  AuthState build() => _state;
}

class _FakeGachaRepo implements GachaRepository {
  _FakeGachaRepo({
    this.pullResult,
    this.crystalsResult,
    this.historyResult,
    this.bundlesResult,
    this.purchaseResult,
  });

  Result<GachaPullResult>? pullResult;
  Result<int>? crystalsResult;
  Result<List<GachaItem>>? historyResult;
  Result<List<CrystalBundle>>? bundlesResult;
  Result<int>? purchaseResult;

  int pullCalls = 0;
  int? lastPullCount;
  String? lastPurchaseProductId;

  @override
  Future<Result<GachaPullResult>> pull({
    required String userId,
    required int count,
  }) async {
    pullCalls++;
    lastPullCount = count;
    return pullResult ?? err(const AppError.network(message: 'no stub'));
  }

  @override
  Future<Result<int>> getCrystals(String userId) async =>
      crystalsResult ?? ok(0);

  @override
  Future<Result<List<GachaItem>>> getPullHistory(String userId) async =>
      historyResult ?? ok(const []);

  @override
  Future<Result<List<CrystalBundle>>> getCrystalBundles() async =>
      bundlesResult ?? ok(const []);

  @override
  Future<Result<int>> purchaseCrystals({
    required String userId,
    required String productId,
  }) async {
    lastPurchaseProductId = productId;
    return purchaseResult ?? err(const AppError.network(message: 'no stub'));
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const _authedState = AuthState(
  status: AuthStatus.authenticated,
  user: AuthUser(uid: 'uid-1', email: 'test@test.com'),
);

const _item = GachaItem(
  id: 'item-1',
  name: 'Soul Veil',
  description: 'A cosmetic veil spun from soul fragments. Ornamental.',
  rarity: GachaRarity.rare,
  category: GachaCategory.cosmetic,
  iconEmoji: '🌌',
);

GachaPullResult _pullResultOf(int count, {int crystalsSpent = 100}) =>
    GachaPullResult(
      items: List.filled(count, _item),
      pulledAt: DateTime(2026),
      crystalsSpent: crystalsSpent,
    );

ProviderContainer _container({
  required _FakeGachaRepo repo,
  AuthState auth = _authedState,
}) {
  final container = ProviderContainer(
    overrides: [
      gachaRepositoryProvider.overrideWithValue(repo),
      authNotifierProvider.overrideWith(() => _FakeAuthNotifier(auth)),
    ],
  );
  addTearDown(container.dispose);
  // Keep the autoDispose notifier alive for the test's duration.
  container.listen(gachaNotifierProvider, (_, __) {});
  return container;
}

/// Lets the notifier's `Future.microtask(_init)` and awaited fakes settle.
Future<void> _settle() async {
  for (var i = 0; i < 5; i++) {
    await Future<void>.delayed(Duration.zero);
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

void main() {
  group('GachaNotifier _init', () {
    test('loads crystals, history and bundles on build', () async {
      final repo = _FakeGachaRepo(
        crystalsResult: ok(800),
        historyResult: ok([_item]),
        bundlesResult: ok(const [
          CrystalBundle(
            productId: 'eidolon.crystals.500',
            crystals: 500,
            displayPrice: '¥800',
            isBestValue: true,
          ),
        ]),
      );
      final container = _container(repo: repo);
      await _settle();

      final state = container.read(gachaNotifierProvider);
      expect(state.isLoading, isFalse);
      expect(state.crystals, 800);
      expect(state.history, hasLength(1));
      expect(state.bundles, hasLength(1));
      expect(state.errorMessage, isNull);
    });

    test('unauthenticated user → just stops loading', () async {
      final repo = _FakeGachaRepo(crystalsResult: ok(999));
      final container = _container(
        repo: repo,
        auth: const AuthState(status: AuthStatus.unauthenticated),
      );
      await _settle();

      final state = container.read(gachaNotifierProvider);
      expect(state.isLoading, isFalse);
      expect(state.crystals, 0);
    });

    test('crystal fetch failure surfaces error message', () async {
      final repo = _FakeGachaRepo(
        crystalsResult: err(const AppError.network(message: 'offline')),
      );
      final container = _container(repo: repo);
      await _settle();

      final state = container.read(gachaNotifierProvider);
      expect(state.crystals, 0);
      expect(state.errorMessage, 'offline');
    });
  });

  group('GachaNotifier pull', () {
    test('success → revealing phase, crystals deducted, history prepended',
        () async {
      final repo = _FakeGachaRepo(
        crystalsResult: ok(500),
        pullResult: ok(_pullResultOf(10, crystalsSpent: 1000)),
      );
      final container = _container(repo: repo);
      await _settle();

      await container.read(gachaNotifierProvider.notifier).pull(count: 10);

      final state = container.read(gachaNotifierProvider);
      expect(state.phase, GachaPhase.revealing);
      expect(state.lastResult, isNotNull);
      expect(state.crystals, 500 - 1000);
      expect(state.history.length, 10);
      expect(repo.lastPullCount, 10);
    });

    test('history is capped at 30 entries', () async {
      final repo = _FakeGachaRepo(
        crystalsResult: ok(0),
        historyResult: ok(List.filled(28, _item)),
        pullResult: ok(_pullResultOf(10)),
      );
      final container = _container(repo: repo);
      await _settle();

      await container.read(gachaNotifierProvider.notifier).pull(count: 10);

      expect(container.read(gachaNotifierProvider).history.length, 30);
    });

    test('failure → back to idle with error message', () async {
      final repo = _FakeGachaRepo(
        crystalsResult: ok(500),
        pullResult: err(const AppError.auth(message: 'session expired')),
      );
      final container = _container(repo: repo);
      await _settle();

      await container.read(gachaNotifierProvider.notifier).pull(count: 1);

      final state = container.read(gachaNotifierProvider);
      expect(state.phase, GachaPhase.idle);
      expect(state.errorMessage, 'session expired');
    });

    test('unauthenticated → pull is a no-op', () async {
      final repo = _FakeGachaRepo(pullResult: ok(_pullResultOf(1)));
      final container = _container(
        repo: repo,
        auth: const AuthState(status: AuthStatus.unauthenticated),
      );
      await _settle();

      await container.read(gachaNotifierProvider.notifier).pull(count: 1);

      expect(repo.pullCalls, 0);
      expect(container.read(gachaNotifierProvider).phase, GachaPhase.idle);
    });
  });

  group('GachaNotifier buyCrystals', () {
    test('success → balance updated', () async {
      final repo = _FakeGachaRepo(
        crystalsResult: ok(100),
        purchaseResult: ok(600),
      );
      final container = _container(repo: repo);
      await _settle();

      await container
          .read(gachaNotifierProvider.notifier)
          .buyCrystals('eidolon.crystals.500');

      final state = container.read(gachaNotifierProvider);
      expect(state.isBuyingCrystals, isFalse);
      expect(state.crystals, 600);
      expect(repo.lastPurchaseProductId, 'eidolon.crystals.500');
    });

    test('failure → error message shown', () async {
      final repo = _FakeGachaRepo(
        purchaseResult:
            err(const AppError.network(message: 'store unreachable')),
      );
      final container = _container(repo: repo);
      await _settle();

      await container
          .read(gachaNotifierProvider.notifier)
          .buyCrystals('eidolon.crystals.80');

      expect(
        container.read(gachaNotifierProvider).errorMessage,
        'store unreachable',
      );
    });

    test('user-cancelled purchase (statusCode 0) → silent, no banner',
        () async {
      final repo = _FakeGachaRepo(
        purchaseResult: err(
          const AppError.network(message: 'cancelled', statusCode: 0),
        ),
      );
      final container = _container(repo: repo);
      await _settle();

      await container
          .read(gachaNotifierProvider.notifier)
          .buyCrystals('eidolon.crystals.80');

      final state = container.read(gachaNotifierProvider);
      expect(state.isBuyingCrystals, isFalse);
      expect(state.errorMessage, isNull);
    });
  });

  group('GachaNotifier phase helpers', () {
    test('finishReveal / reset / clearError transitions', () async {
      final repo = _FakeGachaRepo(
        crystalsResult: ok(500),
        pullResult: ok(_pullResultOf(1)),
      );
      final container = _container(repo: repo);
      await _settle();
      final notifier = container.read(gachaNotifierProvider.notifier);

      await notifier.pull(count: 1);
      expect(
        container.read(gachaNotifierProvider).phase,
        GachaPhase.revealing,
      );

      notifier.finishReveal();
      expect(container.read(gachaNotifierProvider).phase, GachaPhase.done);

      notifier.reset();
      final afterReset = container.read(gachaNotifierProvider);
      expect(afterReset.phase, GachaPhase.idle);
      expect(afterReset.lastResult, isNull);

      // clearError wipes a previous failure message.
      repo.pullResult = err(const AppError.unknown(error: 'boom'));
      await notifier.pull(count: 1);
      expect(
        container.read(gachaNotifierProvider).errorMessage,
        isNotNull,
      );
      notifier.clearError();
      expect(container.read(gachaNotifierProvider).errorMessage, isNull);
    });
  });
}
