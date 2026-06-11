import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:shared_types/shared_types.dart';

part 'dungeon_run.freezed.dart';

@freezed
abstract class DungeonRun with _$DungeonRun {
  const DungeonRun._();

  const factory DungeonRun({
    required String id,
    required String eidolonId,
    required String dungeonId,
    @Default(0) int currentRoom,
    @Default(RunStatus.inProgress) RunStatus status,
    @Default(0) int atkBonus,
    @Default(0) int hpModifier,
    required DateTime startedAt,
    DateTime? endedAt,
  }) = _DungeonRun;

  bool get isActive => status == RunStatus.inProgress;
  bool get isFinished => status != RunStatus.inProgress;
}
