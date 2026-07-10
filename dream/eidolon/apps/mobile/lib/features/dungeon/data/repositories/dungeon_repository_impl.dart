import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/dungeon/data/datasources/dungeon_generate_datasource.dart';
import 'package:eidolon/features/dungeon/data/datasources/dungeon_supabase_datasource.dart';
import 'package:eidolon/features/dungeon/domain/entities/dungeon_generate_response.dart';
import 'package:eidolon/features/dungeon/domain/entities/dungeon_run.dart';
import 'package:eidolon/features/dungeon/domain/repositories/dungeon_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_types/shared_types.dart';

part 'dungeon_repository_impl.g.dart';

@Riverpod(keepAlive: true)
DungeonRepository dungeonRepository(Ref ref) => DungeonRepositoryImpl(
      db: ref.watch(dungeonSupabaseDataSourceProvider),
      generate: ref.watch(dungeonGenerateDataSourceProvider),
    );

class DungeonRepositoryImpl implements DungeonRepository {
  const DungeonRepositoryImpl({
    required this.db,
    required this.generate,
  });

  final DungeonSupabaseDataSource db;
  final DungeonGenerateDataSource generate;

  @override
  Future<Result<DungeonGenerateResult>> generateDungeon({
    required String eidolonId,
    int difficulty = 1,
    DungeonTheme? theme,
  }) =>
      generate.generate(
        eidolonId: eidolonId,
        difficulty: difficulty,
        theme: theme,
      );

  @override
  Future<Result<Dungeon>> getDungeon(String dungeonId) =>
      db.getDungeon(dungeonId);

  @override
  Future<Result<DungeonRun>> startRun({
    required String eidolonId,
    required String dungeonId,
  }) =>
      db.startRun(eidolonId: eidolonId, dungeonId: dungeonId);

  @override
  Future<Result<DungeonRun?>> getActiveRun(String eidolonId) =>
      db.getActiveRun(eidolonId);

  @override
  Future<Result<DungeonRun>> advanceRoom(String runId) => db.advanceRoom(runId);

  @override
  Future<Result<DungeonRun>> finishRun(String runId, RunStatus finalStatus) =>
      db.finishRun(runId, finalStatus);

  @override
  Future<Result<void>> grantCrystals({
    required String authUid,
    required int amount,
    required String receiptId,
  }) =>
      db.grantCrystals(
        authUid: authUid,
        amount: amount,
        receiptId: receiptId,
      );
}
