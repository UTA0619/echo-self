import 'package:shared_types/shared_types.dart';

class MemoryModel {
  static MemoryEntry fromRow(Map<String, dynamic> row) => MemoryEntry(
        id: row['id'] as String,
        eidolonId: row['eidolon_id'] as String,
        memoryType: MemoryType.fromString(
          (row['memory_type'] as String?) ?? 'episodic',
        ),
        content: row['content'] as String,
        importance: (row['importance'] as num?)?.toDouble() ?? 0.5,
        emotionTag: row['emotion_tag'] as String?,
        source: row['source'] as String?,
        sourceRef: row['source_ref'] as String?,
        accessCount: (row['access_count'] as num?)?.toInt() ?? 0,
        lastAccessed: row['last_accessed'] != null
            ? DateTime.parse(row['last_accessed'] as String)
            : null,
        createdAt: DateTime.parse(row['created_at'] as String),
      );
}
