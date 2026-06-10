import 'dart:async';

import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/core/firebase/firebase_service.dart';
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
      final dungeonResult = await ref
          .read(dungeonRepositoryCheckProvider)
          .call(run.dungeonId);

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

    final Result<DungeonGenerateResult> genResult = await ref
        .read(generateDungeonUseCaseProvider)
        .call(
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
      errorMessage: null,
    );
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

    state = state.copyWith(isLoading: true);
    final Result<DungeonRun> result =
        await ref.read(finishRunUseCaseProvider).call(run.id, status);

    state = state.copyWith(
      isLoading: false,
      run: result.isSuccess ? result.value : run.copyWith(status: status),
      phase: DungeonPhase.result,
    );

    if (status == RunStatus.completed) {
      // Guarded: analytics must never break the run flow (e.g. Firebase not
      // initialized in unit tests).
      try {
        unawaited(ref.read(firebaseAnalyticsProvider).logEvent(
          name: 'dungeon_complete',
          parameters: {
            'run_id': run.id,
            'difficulty': state.selectedDifficulty,
          },
        ));
      } catch (_) {/* analytics unavailable — non-fatal */}
    }
  }

  void backToHub() =>
      state = state.copyWith(
        phase: DungeonPhase.hub,
        dungeon: null,
        run: null,
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
