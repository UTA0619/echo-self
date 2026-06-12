import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/eidolon/domain/entities/chat_message.dart';
import 'package:eidolon/features/eidolon/domain/repositories/eidolon_repository.dart';
import 'package:eidolon/features/eidolon/domain/usecases/get_eidolon_usecase.dart';
import 'package:eidolon/features/eidolon/domain/usecases/get_recent_memories_usecase.dart';
import 'package:eidolon/features/eidolon/domain/usecases/send_message_usecase.dart';
import 'package:eidolon/features/home/domain/entities/home_summary.dart';
import 'package:eidolon/features/home/domain/repositories/home_repository.dart';
import 'package:eidolon/features/home/domain/usecases/get_home_summary_usecase.dart';
import 'package:eidolon/features/home/domain/usecases/get_player_profile_usecase.dart';
import 'package:eidolon/features/home/presentation/providers/home_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_types/shared_types.dart';

// ── Fake repos ────────────────────────────────────────────────────────────────

class _FakeHomeRepo implements HomeRepository {
  _FakeHomeRepo({this.playerResult, this.summaryResult});

  final Result<PlayerProfile>? playerResult;
  final Result<HomeSummary>? summaryResult;

  @override
  Future<Result<PlayerProfile>> getPlayerProfile(String authUid) async =>
      playerResult ?? err(const AppError.unknown(error: 'not set'));

  @override
  Future<Result<HomeSummary>> getHomeSummary(String eidolonId) async =>
      summaryResult ?? ok(HomeSummary.empty);
}

class _FakeEidolonRepo implements EidolonRepository {
  _FakeEidolonRepo({this.eidolonResult});
  final Result<EidolonProfile>? eidolonResult;

  @override
  Future<Result<EidolonProfile>> getEidolonForCurrentUser() async =>
      eidolonResult ?? err(const AppError.unknown(error: 'not set'));

  @override
  Future<Result<List<MemoryEntry>>> getRecentMemories({
    required String eidolonId,
    int limit = 20,
  }) async =>
      ok(<MemoryEntry>[]);

  @override
  Future<Result<List<ChatMessage>>> getChatHistory({
    required String eidolonId,
    int limit = 50,
  }) async =>
      ok(<ChatMessage>[]);
}

// ── Factories ─────────────────────────────────────────────────────────────────

PlayerProfile _makePlayer() => PlayerProfile(
      id: 'player-1',
      authUid: 'auth-1',
      username: 'TestPlayer',
      createdAt: DateTime(2025),
      lastActive: DateTime(2025),
    );

EidolonProfile _makeEidolon() => EidolonProfile(
      id: 'eid-1',
      userId: 'player-1',
      name: 'Shadow',
      personality: const PersonalityProfile(
        openness: 70,
        conscientiousness: 60,
        extraversion: 50,
        agreeableness: 55,
        neuroticism: 30,
      ),
      createdAt: DateTime(2025),
      updatedAt: DateTime(2025),
    );

HomeSummary _makeSummary({
  int runsToday = 2,
  int streak = 3,
  bool hasActive = false,
}) =>
    HomeSummary(
      dungeonRunsToday: runsToday,
      currentStreak: streak,
      hasActiveRun: hasActive,
    );

ProviderContainer _makeContainer({
  required _FakeHomeRepo homeRepo,
  required _FakeEidolonRepo eidolonRepo,
}) {
  return ProviderContainer(
    overrides: [
      getPlayerProfileUseCaseProvider.overrideWith(
        (ref) => GetPlayerProfileUseCase(homeRepo),
      ),
      getHomeSummaryUseCaseProvider.overrideWith(
        (ref) => GetHomeSummaryUseCase(homeRepo),
      ),
      getEidolonUseCaseProvider.overrideWith(
        (ref) => GetEidolonUseCase(eidolonRepo),
      ),
      getRecentMemoriesUseCaseProvider.overrideWith(
        (ref) => GetRecentMemoriesUseCase(eidolonRepo),
      ),
      sendMessageUseCaseProvider.overrideWith(
        (ref) => throw UnimplementedError(),
      ),
    ],
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

void main() {
  group('HomeNotifier', () {
    test('initial state is empty', () {
      final container = _makeContainer(
        homeRepo: _FakeHomeRepo(),
        eidolonRepo: _FakeEidolonRepo(),
      );
      addTearDown(container.dispose);
      final state = container.read(homeNotifierProvider);
      expect(state.player, isNull);
      expect(state.eidolon, isNull);
      expect(state.summary, isNull);
      expect(state.isLoading, false);
      expect(state.errorMessage, isNull);
    });

    test('load sets player + eidolon + summary on full success', () async {
      final container = _makeContainer(
        homeRepo: _FakeHomeRepo(
          playerResult: ok(_makePlayer()),
          summaryResult: ok(_makeSummary()),
        ),
        eidolonRepo: _FakeEidolonRepo(eidolonResult: ok(_makeEidolon())),
      );
      addTearDown(container.dispose);

      await container.read(homeNotifierProvider.notifier).load('auth-1');

      final state = container.read(homeNotifierProvider);
      expect(state.player?.username, 'TestPlayer');
      expect(state.eidolon?.name, 'Shadow');
      expect(state.summary?.dungeonRunsToday, 2);
      expect(state.summary?.currentStreak, 3);
      expect(state.isLoading, false);
      expect(state.errorMessage, isNull);
    });

    test('load sets errorMessage when player profile fetch fails', () async {
      final container = _makeContainer(
        homeRepo: _FakeHomeRepo(
          playerResult: err(const AppError.network(message: 'No connection')),
        ),
        eidolonRepo: _FakeEidolonRepo(),
      );
      addTearDown(container.dispose);

      await container.read(homeNotifierProvider.notifier).load('auth-1');

      final state = container.read(homeNotifierProvider);
      expect(state.player, isNull);
      expect(state.errorMessage, 'No connection');
      expect(state.isLoading, false);
    });

    test('load sets player even when eidolon fetch fails', () async {
      final container = _makeContainer(
        homeRepo: _FakeHomeRepo(
          playerResult: ok(_makePlayer()),
          summaryResult: ok(HomeSummary.empty),
        ),
        eidolonRepo: _FakeEidolonRepo(
          eidolonResult: err(const AppError.network(message: 'Eidolon gone')),
        ),
      );
      addTearDown(container.dispose);

      await container.read(homeNotifierProvider.notifier).load('auth-1');

      final state = container.read(homeNotifierProvider);
      expect(state.player?.username, 'TestPlayer');
      expect(state.eidolon, isNull);
      expect(state.errorMessage, 'Eidolon gone');
    });

    test('load with active run sets summary.hasActiveRun', () async {
      final container = _makeContainer(
        homeRepo: _FakeHomeRepo(
          playerResult: ok(_makePlayer()),
          summaryResult: ok(
            _makeSummary(hasActive: true),
          ),
        ),
        eidolonRepo: _FakeEidolonRepo(eidolonResult: ok(_makeEidolon())),
      );
      addTearDown(container.dispose);

      await container.read(homeNotifierProvider.notifier).load('auth-1');

      expect(
        container.read(homeNotifierProvider).summary?.hasActiveRun,
        true,
      );
    });

    test('clearError removes errorMessage', () async {
      final container = _makeContainer(
        homeRepo: _FakeHomeRepo(
          playerResult: err(const AppError.network(message: 'err')),
        ),
        eidolonRepo: _FakeEidolonRepo(),
      );
      addTearDown(container.dispose);

      await container.read(homeNotifierProvider.notifier).load('auth-1');
      expect(container.read(homeNotifierProvider).errorMessage, isNotNull);

      container.read(homeNotifierProvider.notifier).clearError();
      expect(container.read(homeNotifierProvider).errorMessage, isNull);
    });
  });

  group('HomeSummary', () {
    test('empty has zero stats and no active run', () {
      expect(HomeSummary.empty.dungeonRunsToday, 0);
      expect(HomeSummary.empty.currentStreak, 0);
      expect(HomeSummary.empty.hasActiveRun, false);
      expect(HomeSummary.empty.activeRunId, isNull);
    });

    test('hasActiveRun true when activeRunId provided', () {
      const s = HomeSummary(
        dungeonRunsToday: 1,
        currentStreak: 5,
        hasActiveRun: true,
        activeRunId: 'run-99',
      );
      expect(s.hasActiveRun, true);
      expect(s.activeRunId, 'run-99');
    });
  });
}
