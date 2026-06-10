import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/dungeon/domain/entities/dungeon_generate_response.dart';
import 'package:eidolon/features/dungeon/domain/entities/dungeon_run.dart';
import 'package:eidolon/features/dungeon/domain/repositories/dungeon_repository.dart';
import 'package:eidolon/features/dungeon/domain/usecases/advance_room_usecase.dart';
import 'package:eidolon/features/dungeon/domain/usecases/finish_run_usecase.dart';
import 'package:eidolon/features/dungeon/domain/usecases/generate_dungeon_usecase.dart';
import 'package:eidolon/features/dungeon/domain/usecases/get_active_run_usecase.dart';
import 'package:eidolon/features/dungeon/domain/usecases/start_run_usecase.dart';
import 'package:eidolon/features/dungeon/presentation/providers/dungeon_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_types/shared_types.dart';

// ── Fake repository ───────────────────────────────────────────────────────────

class _FakeDungeonRepo implements DungeonRepository {
  _FakeDungeonRepo({
    this.generateResult,
    this.startRunResult,
    this.activeRunResult,
    this.advanceResult,
    this.finishResult,
  });

  final Result<DungeonGenerateResult>? generateResult;
  final Result<DungeonRun>? startRunResult;
  final Result<DungeonRun?>? activeRunResult;
  final Result<DungeonRun>? advanceResult;
  final Result<DungeonRun>? finishResult;

  @override
  Future<Result<DungeonGenerateResult>> generateDungeon({
    required String eidolonId,
    int difficulty = 1,
    DungeonTheme? theme,
  }) async =>
      generateResult ?? err(const AppError.unknown(error: 'not set'));

  @override
  Future<Result<Dungeon>> getDungeon(String dungeonId) async =>
      ok(_makeDungeon());

  @override
  Future<Result<DungeonRun>> startRun({
    required String eidolonId,
    required String dungeonId,
  }) async =>
      startRunResult ?? ok(_makeRun(dungeonId: dungeonId));

  @override
  Future<Result<DungeonRun?>> getActiveRun(String eidolonId) async =>
      activeRunResult ?? ok<DungeonRun?>(null);

  @override
  Future<Result<DungeonRun>> advanceRoom(String runId) async =>
      advanceResult ?? ok(_makeRun().copyWith(currentRoom: 1));

  @override
  Future<Result<DungeonRun>> finishRun(
    String runId,
    RunStatus finalStatus,
  ) async =>
      finishResult ?? ok(_makeRun().copyWith(status: finalStatus));
}

// ── Factories ─────────────────────────────────────────────────────────────────

Dungeon _makeDungeon({int roomCount = 3}) => Dungeon(
      id: 'dungeon-1',
      theme: DungeonTheme.forest,
      difficulty: 1,
      name: 'Test Forest',
      narrativeIntro: 'A dark forest awaits.',
      rooms: List.generate(
        roomCount,
        (i) => DungeonRoom(
          index: i,
          description: 'Room $i',
          eventType: i == roomCount - 1 ? 'boss' : 'combat',
        ),
      ),
      createdAt: DateTime(2025),
      expiresAt: DateTime(2025, 1, 2),
    );

DungeonRun _makeRun({
  String dungeonId = 'dungeon-1',
  int currentRoom = 0,
  RunStatus status = RunStatus.inProgress,
}) =>
    DungeonRun(
      id: 'run-1',
      eidolonId: 'eid-1',
      dungeonId: dungeonId,
      currentRoom: currentRoom,
      status: status,
      startedAt: DateTime(2025),
    );

ProviderContainer _makeContainer(_FakeDungeonRepo repo) {
  return ProviderContainer(
    overrides: [
      generateDungeonUseCaseProvider.overrideWith(
        (ref) => GenerateDungeonUseCase(repo),
      ),
      getActiveRunUseCaseProvider.overrideWith(
        (ref) => GetActiveRunUseCase(repo),
      ),
      startRunUseCaseProvider.overrideWith(
        (ref) => StartRunUseCase(repo),
      ),
      advanceRoomUseCaseProvider.overrideWith(
        (ref) => AdvanceRoomUseCase(repo),
      ),
      finishRunUseCaseProvider.overrideWith(
        (ref) => FinishRunUseCase(repo),
      ),
      dungeonRepositoryCheckProvider.overrideWith(
        (ref) => DungeonLoader(repo),
      ),
    ],
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

void main() {
  group('DungeonNotifier', () {
    test('initial state is hub with default difficulty', () {
      final container = _makeContainer(_FakeDungeonRepo());
      addTearDown(container.dispose);
      final state = container.read(dungeonNotifierProvider);
      expect(state.phase, DungeonPhase.hub);
      expect(state.selectedDifficulty, 1);
      expect(state.dungeon, isNull);
      expect(state.run, isNull);
    });

    test('setDifficulty updates selectedDifficulty', () {
      final container = _makeContainer(_FakeDungeonRepo());
      addTearDown(container.dispose);
      container.read(dungeonNotifierProvider.notifier).setDifficulty(7);
      expect(container.read(dungeonNotifierProvider).selectedDifficulty, 7);
    });

    test('setTheme updates selectedTheme and null clears it', () {
      final container = _makeContainer(_FakeDungeonRepo());
      addTearDown(container.dispose);
      container.read(dungeonNotifierProvider.notifier).setTheme(DungeonTheme.cave);
      expect(
        container.read(dungeonNotifierProvider).selectedTheme,
        DungeonTheme.cave,
      );
      container.read(dungeonNotifierProvider.notifier).setTheme(null);
      expect(container.read(dungeonNotifierProvider).selectedTheme, isNull);
    });

    test('generateAndStart transitions to run phase on success', () async {
      final dungeon = _makeDungeon();
      final repo = _FakeDungeonRepo(
        generateResult: ok(DungeonGenerateResult(
          dungeon: dungeon,
          modelUsed: 'claude-haiku-4-5',
          generationMs: 500,
        ),),
        startRunResult: ok(_makeRun()),
      );
      final container = _makeContainer(repo);
      addTearDown(container.dispose);

      await container
          .read(dungeonNotifierProvider.notifier)
          .generateAndStart('eid-1');

      final state = container.read(dungeonNotifierProvider);
      expect(state.phase, DungeonPhase.run);
      expect(state.dungeon?.id, 'dungeon-1');
      expect(state.run?.currentRoom, 0);
      expect(state.errorMessage, isNull);
    });

    test('generateAndStart sets errorMessage on generation failure', () async {
      final repo = _FakeDungeonRepo(
        generateResult:
            err(const AppError.network(message: 'No connection')),
      );
      final container = _makeContainer(repo);
      addTearDown(container.dispose);

      await container
          .read(dungeonNotifierProvider.notifier)
          .generateAndStart('eid-1');

      final state = container.read(dungeonNotifierProvider);
      expect(state.phase, DungeonPhase.hub);
      expect(state.errorMessage, 'No connection');
    });

    test('advanceRoom increments room index', () async {
      final dungeon = _makeDungeon();
      final repo = _FakeDungeonRepo(
        generateResult: ok(DungeonGenerateResult(
          dungeon: dungeon,
          modelUsed: 'test',
          generationMs: 0,
        ),),
        advanceResult: ok(_makeRun(currentRoom: 1)),
      );
      final container = _makeContainer(repo);
      addTearDown(container.dispose);

      await container
          .read(dungeonNotifierProvider.notifier)
          .generateAndStart('eid-1');
      await container.read(dungeonNotifierProvider.notifier).advanceRoom();

      expect(container.read(dungeonNotifierProvider).run?.currentRoom, 1);
    });

    test('advanceRoom on last room completes the run', () async {
      final dungeon = _makeDungeon(roomCount: 2);
      final repo = _FakeDungeonRepo(
        generateResult: ok(DungeonGenerateResult(
          dungeon: dungeon,
          modelUsed: 'test',
          generationMs: 0,
        ),),
        startRunResult: ok(_makeRun(currentRoom: 1)),
        finishResult: ok(_makeRun(status: RunStatus.completed)),
      );
      final container = _makeContainer(repo);
      addTearDown(container.dispose);

      await container
          .read(dungeonNotifierProvider.notifier)
          .generateAndStart('eid-1');
      // currentRoom=1, rooms.length=2 → last room
      await container.read(dungeonNotifierProvider.notifier).advanceRoom();

      final state = container.read(dungeonNotifierProvider);
      expect(state.phase, DungeonPhase.result);
      expect(state.run?.status, RunStatus.completed);
    });

    test('abandonRun transitions to result phase with abandoned status',
        () async {
      final dungeon = _makeDungeon();
      final repo = _FakeDungeonRepo(
        generateResult: ok(DungeonGenerateResult(
          dungeon: dungeon,
          modelUsed: 'test',
          generationMs: 0,
        ),),
        finishResult: ok(_makeRun(status: RunStatus.abandoned)),
      );
      final container = _makeContainer(repo);
      addTearDown(container.dispose);

      await container
          .read(dungeonNotifierProvider.notifier)
          .generateAndStart('eid-1');
      await container.read(dungeonNotifierProvider.notifier).abandonRun();

      final state = container.read(dungeonNotifierProvider);
      expect(state.phase, DungeonPhase.result);
      expect(state.run?.status, RunStatus.abandoned);
    });

    test('backToHub resets to hub phase', () async {
      final dungeon = _makeDungeon();
      final repo = _FakeDungeonRepo(
        generateResult: ok(DungeonGenerateResult(
          dungeon: dungeon,
          modelUsed: 'test',
          generationMs: 0,
        ),),
        finishResult: ok(_makeRun(status: RunStatus.abandoned)),
      );
      final container = _makeContainer(repo);
      addTearDown(container.dispose);

      await container
          .read(dungeonNotifierProvider.notifier)
          .generateAndStart('eid-1');
      await container.read(dungeonNotifierProvider.notifier).abandonRun();
      container.read(dungeonNotifierProvider.notifier).backToHub();

      final state = container.read(dungeonNotifierProvider);
      expect(state.phase, DungeonPhase.hub);
      expect(state.dungeon, isNull);
      expect(state.run, isNull);
    });

    test('checkForActiveRun restores run phase when active run exists',
        () async {
      final repo = _FakeDungeonRepo(
        activeRunResult: ok(_makeRun()),
      );
      final container = _makeContainer(repo);
      addTearDown(container.dispose);

      await container
          .read(dungeonNotifierProvider.notifier)
          .checkForActiveRun('eid-1');

      final state = container.read(dungeonNotifierProvider);
      expect(state.phase, DungeonPhase.run);
      expect(state.run?.id, 'run-1');
    });

    test('checkForActiveRun stays in hub when no active run', () async {
      final repo = _FakeDungeonRepo(activeRunResult: ok<DungeonRun?>(null));
      final container = _makeContainer(repo);
      addTearDown(container.dispose);

      await container
          .read(dungeonNotifierProvider.notifier)
          .checkForActiveRun('eid-1');

      expect(
        container.read(dungeonNotifierProvider).phase,
        DungeonPhase.hub,
      );
    });
  });

  group('DungeonRun', () {
    test('isActive returns true for inProgress status', () {
      expect(_makeRun().isActive, true);
      expect(_makeRun(status: RunStatus.completed).isActive, false);
    });

    test('isFinished returns true for non-inProgress status', () {
      expect(_makeRun(status: RunStatus.completed).isFinished, true);
      expect(_makeRun(status: RunStatus.abandoned).isFinished, true);
      expect(_makeRun().isFinished, false);
    });
  });
}
