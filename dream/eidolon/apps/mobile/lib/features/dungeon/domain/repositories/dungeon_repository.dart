import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/dungeon/domain/entities/dungeon_generate_response.dart';
import 'package:eidolon/features/dungeon/domain/entities/dungeon_run.dart';
import 'package:shared_types/shared_types.dart';

abstract interface class DungeonRepository {
  /// Call the `dungeon-generate` edge function and persist the result.
  Future<Result<DungeonGenerateResult>> generateDungeon({
    required String eidolonId,
    int difficulty = 1,
    DungeonTheme? theme,
  });

  /// Fetch a previously generated dungeon by ID.
  Future<Result<Dungeon>> getDungeon(String dungeonId);

  /// Create a new run for an eidolon entering a dungeon.
  Future<Result<DungeonRun>> startRun({
    required String eidolonId,
    required String dungeonId,
  });

  /// Fetch the current active run for an eidolon, if any.
  Future<Result<DungeonRun?>> getActiveRun(String eidolonId);

  /// Advance to the next room.
  Future<Result<DungeonRun>> advanceRoom(String runId);

  /// Mark a run as completed or abandoned.
  Future<Result<DungeonRun>> finishRun(String runId, RunStatus finalStatus);
}
