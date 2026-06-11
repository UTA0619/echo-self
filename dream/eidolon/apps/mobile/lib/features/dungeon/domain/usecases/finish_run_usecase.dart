import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/dungeon/data/repositories/dungeon_repository_impl.dart';
import 'package:eidolon/features/dungeon/domain/entities/dungeon_run.dart';
import 'package:eidolon/features/dungeon/domain/repositories/dungeon_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_types/shared_types.dart';

part 'finish_run_usecase.g.dart';

@riverpod
FinishRunUseCase finishRunUseCase(Ref ref) =>
    FinishRunUseCase(ref.watch(dungeonRepositoryProvider));

class FinishRunUseCase {
  const FinishRunUseCase(this._repo);
  final DungeonRepository _repo;

  Future<Result<DungeonRun>> call(String runId, RunStatus finalStatus) =>
      _repo.finishRun(runId, finalStatus);
}
