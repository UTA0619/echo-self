import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/dungeon/data/repositories/dungeon_repository_impl.dart';
import 'package:eidolon/features/dungeon/domain/entities/dungeon_run.dart';
import 'package:eidolon/features/dungeon/domain/repositories/dungeon_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'advance_room_usecase.g.dart';

@riverpod
AdvanceRoomUseCase advanceRoomUseCase(Ref ref) =>
    AdvanceRoomUseCase(ref.watch(dungeonRepositoryProvider));

class AdvanceRoomUseCase {
  const AdvanceRoomUseCase(this._repo);
  final DungeonRepository _repo;

  Future<Result<DungeonRun>> call(String runId) => _repo.advanceRoom(runId);
}
