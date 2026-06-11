import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:shared_types/src/enums/dungeon_theme.dart';

part 'dungeon.freezed.dart';
part 'dungeon.g.dart';

@freezed
abstract class DungeonRoom with _$DungeonRoom {
  const factory DungeonRoom({
    required int index,
    required String description,
    required String eventType, // 'combat' | 'treasure' | 'rest' | 'story' | 'boss'
    @Default({}) Map<String, dynamic> eventData,
    @Default(false) bool isCleared,
  }) = _DungeonRoom;

  factory DungeonRoom.fromJson(Map<String, dynamic> json) =>
      _$DungeonRoomFromJson(json);
}

@freezed
abstract class Dungeon with _$Dungeon {
  const factory Dungeon({
    required String id,
    required DungeonTheme theme,
    required int difficulty,
    required String name,
    required String narrativeIntro,
    @Default([]) List<DungeonRoom> rooms,
    @Default({}) Map<String, dynamic> bossConfig,
    @Default([]) List<Map<String, dynamic>> specialEvents,
    required DateTime createdAt,
    required DateTime expiresAt,
  }) = _Dungeon;

  factory Dungeon.fromJson(Map<String, dynamic> json) =>
      _$DungeonFromJson(json);
}
