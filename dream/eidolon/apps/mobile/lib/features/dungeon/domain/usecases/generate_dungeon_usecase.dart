import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/dungeon/data/repositories/dungeon_repository_impl.dart';
import 'package:eidolon/features/dungeon/domain/entities/dungeon_generate_response.dart';
import 'package:eidolon/features/dungeon/domain/repositories/dungeon_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_types/shared_types.dart';

part 'generate_dungeon_usecase.g.dart';

@riverpod
GenerateDungeonUseCase generateDungeonUseCase(Ref ref) =>
    GenerateDungeonUseCase(ref.watch(dungeonRepositoryProvider));

class GenerateDungeonUseCase {
  const GenerateDungeonUseCase(this._repo);
  final DungeonRepository _repo;

  Future<Result<DungeonGenerateResult>> call({
    required String eidolonId,
    int difficulty = 1,
    DungeonTheme? theme,
  }) =>
      _repo.generateDungeon(
        eidolonId: eidolonId,
        difficulty: difficulty,
        theme: theme,
      );
}
