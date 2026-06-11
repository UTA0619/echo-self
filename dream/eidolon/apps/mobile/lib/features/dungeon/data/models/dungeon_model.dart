import 'package:shared_types/shared_types.dart';

class DungeonModel {
  static Dungeon fromRow(Map<String, dynamic> row) {
    final layout = (row['layout'] as List<dynamic>? ?? [])
        .map((r) => DungeonRoom.fromJson(r as Map<String, dynamic>))
        .toList();

    final now = DateTime.now();
    return Dungeon(
      id: row['id'] as String,
      theme: DungeonTheme.fromString((row['theme'] as String?) ?? 'forest'),
      difficulty: (row['difficulty'] as num?)?.toInt() ?? 1,
      name: row['name'] as String? ?? 'Unknown Dungeon',
      narrativeIntro: row['narrative_intro'] as String? ?? '',
      rooms: layout,
      bossConfig: (row['boss_config'] as Map<String, dynamic>?) ?? {},
      createdAt: row['created_at'] != null
          ? DateTime.parse(row['created_at'] as String)
          : now,
      expiresAt: row['expires_at'] != null
          ? DateTime.parse(row['expires_at'] as String)
          : now.add(const Duration(hours: 24)),
    );
  }
}
