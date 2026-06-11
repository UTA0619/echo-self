import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/dungeon/data/repositories/dungeon_repository_impl.dart';
import 'package:eidolon/features/dungeon/domain/entities/dungeon_run.dart';
import 'package:eidolon/features/dungeon/domain/repositories/dungeon_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'start_run_usecase.g.dart';

@riverpod
StartRunUseCase startRunUseCase(Ref ref) =>
    StartRunUseCase(ref.watch(dungeonRepositoryProvider));

class StartRunUseCase {
  const StartRunUseCase(this._repo);
  final DungeonRepository _repo;

  Future<Result<DungeonRun>> call({
    required String eidolonId,
    required String dungeonId,
  }) =>
      _repo.startRun(eidolonId: eidolonId, dungeonId: dungeonId);
}
