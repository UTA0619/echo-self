import 'package:eidolon/features/dungeon/domain/entities/dungeon_run.dart';
import 'package:shared_types/shared_types.dart';

class DungeonRunModel {
  static DungeonRun fromRow(Map<String, dynamic> row) => DungeonRun(
        id: row['id'] as String,
        eidolonId: row['eidolon_id'] as String,
        dungeonId: row['dungeon_id'] as String,
        currentRoom: (row['current_room'] as num?)?.toInt() ?? 0,
        status: RunStatus.fromString(
          (row['status'] as String?) ?? 'in_progress',
        ),
        atkBonus: (row['atk_bonus'] as num?)?.toInt() ?? 0,
        hpModifier: (row['hp_modifier'] as num?)?.toInt() ?? 0,
        startedAt: DateTime.parse(row['started_at'] as String),
        endedAt: row['completed_at'] != null
            ? DateTime.parse(row['completed_at'] as String)
            : null,
      );
}
