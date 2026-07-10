import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/auth/presentation/providers/auth_provider.dart';
import 'package:eidolon/features/bond/presentation/bond_provider.dart';
import 'package:eidolon/features/dungeon/data/repositories/dungeon_repository_impl.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:eidolon/features/dungeon/domain/entities/dungeon_generate_response.dart';
import 'package:eidolon/features/dungeon/domain/entities/dungeon_run.dart';
import 'package:eidolon/features/dungeon/domain/repositories/dungeon_repository.dart';
import 'package:eidolon/features/dungeon/domain/usecases/advance_room_usecase.dart';
import 'package:eidolon/features/dungeon/domain/usecases/finish_run_usecase.dart';
import 'package:eidolon/features/dungeon/domain/usecases/generate_dungeon_usecase.dart';
import 'package:eidolon/features/dungeon/domain/usecases/get_active_run_usecase.dart';
import 'package:eidolon/features/dungeon/domain/usecases/start_run_usecase.dart';
import 'package:eidolon/features/eidolon/presentation/providers/eidolon_provider.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_types/shared_types.dart';

part 'dungeon_provider.freezed.dart';
part 'dungeon_provider.g.dart';

enum DungeonPhase { hub, generating, run, result }

@freezed
abstract class DungeonState with _$DungeonState {
  const factory DungeonState({
    @Default(DungeonPhase.hub) DungeonPhase phase,
    Dungeon? dungeon,
    DungeonRun? run,
    @Default(1) int selectedDifficulty,
    DungeonTheme? selectedTheme,
    @Default(false) bool isLoading,
    @Default(0) int crystalsEarned,
    @Default(0) int xpEarned,
    @Default(0) int levelsGained,
    @Default(false) bool awaitingNext,
    String? errorMessage,
  }) = _DungeonState;
}

@riverpod
class DungeonNotifier extends _$DungeonNotifier {
  @override
  DungeonState build() => const DungeonState();

  void setDifficulty(int value) =>
      state = state.copyWith(selectedDifficulty: value, errorMessage: null);

  void setTheme(DungeonTheme? theme) =>
      state = state.copyWith(selectedTheme: theme, errorMessage: null);

  Future<void> checkForActiveRun(String eidolonId) async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    final Result<DungeonRun?> result =
        await ref.read(getActiveRunUseCaseProvider).call(eidolonId);

    if (result.isSuccess && result.value != null) {
      final run = result.value!;
      // Also load the dungeon for this run
      final dungeonResult =
          await ref.read(dungeonRepositoryCheckProvider).call(run.dungeonId);

      state = state.copyWith(
        isLoading: false,
        run: run,
        dungeon: dungeonResult,
        phase: DungeonPhase.run,
      );
    } else {
      state = state.copyWith(isLoading: false, phase: DungeonPhase.hub);
    }
  }

  Future<void> generateAndStart(String eidolonId) async {
    state = state.copyWith(phase: DungeonPhase.generating, errorMessage: null);

    final Result<DungeonGenerateResult> genResult =
        await ref.read(generateDungeonUseCaseProvider).call(
              eidolonId: eidolonId,
              difficulty: state.selectedDifficulty,
              theme: state.selectedTheme,
            );

    if (!genResult.isSuccess) {
      state = state.copyWith(
        phase: DungeonPhase.hub,
        errorMessage: _errorMsg(genResult.error!),
      );
      return;
    }

    final generated = genResult.value!;

    final Result<DungeonRun> runResult = await ref
        .read(startRunUseCaseProvider)
        .call(eidolonId: eidolonId, dungeonId: generated.dungeon.id);

    if (!runResult.isSuccess) {
      state = state.copyWith(
        phase: DungeonPhase.hub,
        errorMessage: _errorMsg(runResult.error!),
      );
      return;
    }

    state = state.copyWith(
      phase: DungeonPhase.run,
      dungeon: generated.dungeon,
      run: runResult.value,
      crystalsEarned: 0,
      xpEarned: 0,
      levelsGained: 0,
      awaitingNext: false,
      errorMessage: null,
    );
  }

  /// Resolve the outcome of the current room's battle. On a win we bank the
  /// room's reward and pause on a "next" beat; on a loss the run ends.
  void onBattleResult(bool victory) {
    final run = state.run;
    final dungeon = state.dungeon;
    if (run == null || dungeon == null || state.awaitingNext) return;
    if (!victory) {
      _finish(RunStatus.failed);
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

  /// Tapped "next" after a won battle — advance (or finish the run).
  Future<void> continueAfterWin() async {
    state = state.copyWith(awaitingNext: false);
    await advanceRoom();
  }

  /// Re-roll a fresh dungeon at the same difficulty — the "one more run" loop.
  Future<void> retry(String eidolonId) async {
    state = state.copyWith(
      phase: DungeonPhase.hub,
      dungeon: null,
      run: null,
      crystalsEarned: 0,
      xpEarned: 0,
      levelsGained: 0,
      awaitingNext: false,
      errorMessage: null,
    );
    await generateAndStart(eidolonId);
  }

  Future<void> advanceRoom() async {
    final run = state.run;
    final dungeon = state.dungeon;
    if (run == null || dungeon == null) return;

    // If on last room, complete the run
    if (run.currentRoom >= dungeon.rooms.length - 1) {
      await _finish(RunStatus.completed);
      return;
    }

    state = state.copyWith(isLoading: true);
    final Result<DungeonRun> result =
        await ref.read(advanceRoomUseCaseProvider).call(run.id);

    state = result.isSuccess
        ? state.copyWith(isLoading: false, run: result.value)
        : state.copyWith(
            isLoading: false,
            errorMessage: _errorMsg(result.error!),
          );
  }

  Future<void> abandonRun() async {
    await _finish(RunStatus.abandoned);
  }

  Future<void> _finish(RunStatus status) async {
    final run = state.run;
    if (run == null) return;

    state = state.copyWith(isLoading: true, awaitingNext: false);
    final Result<DungeonRun> result =
        await ref.read(finishRunUseCaseProvider).call(run.id, status);

    // Bank the crystals earned this run (idempotent per run id), so the dungeon
    // feeds the gacha economy — the reason to keep coming back.
    if (state.crystalsEarned > 0) {
      final authUid = ref.read(authNotifierProvider).user?.uid;
      if (authUid != null) {
        await ref.read(dungeonRepositoryProvider).grantCrystals(
              authUid: authUid,
              amount: state.crystalsEarned,
              receiptId: 'run-${run.id}',
            );
      }
    }

    // Apply earned XP to the Eidolon — real, persisted growth: level-ups raise
    // its stats, so the next run is genuinely easier.
    var levelsGained = 0;
    if (state.xpEarned > 0) {
      levelsGained =
          await ref.read(eidolonNotifierProvider.notifier).gainXp(state.xpEarned);
    }

    // Conquering a dungeon together deepens the bond.
    if (status == RunStatus.completed) {
      await ref.read(bondNotifierProvider.notifier).addPoints(10);
    }

    state = state.copyWith(
      isLoading: false,
      run: result.isSuccess ? result.value : run.copyWith(status: status),
      levelsGained: levelsGained,
      phase: DungeonPhase.result,
    );
  }

  void backToHub() => state = state.copyWith(
        phase: DungeonPhase.hub,
        dungeon: null,
        run: null,
        crystalsEarned: 0,
        xpEarned: 0,
        levelsGained: 0,
        awaitingNext: false,
        errorMessage: null,
      );

  void clearError() => state = state.copyWith(errorMessage: null);

  static String _errorMsg(AppError error) => switch (error) {
        NetworkError(:final message) => message,
        AuthError(:final message) => message,
        AiError(:final message) => message,
        _ => error.toString(),
      };
}

// Thin helper provider to fetch a dungeon by ID during checkForActiveRun.
// Avoids circular dependency by keeping it in the same file.
@riverpod
DungeonLoader dungeonRepositoryCheck(Ref ref) =>
    DungeonLoader(ref.watch(dungeonRepositoryProvider));

class DungeonLoader {
  const DungeonLoader(this._repo);
  final DungeonRepository _repo;

  Future<Dungeon?> call(String dungeonId) async {
    final result = await _repo.getDungeon(dungeonId);
    return result.value;
  }
}
