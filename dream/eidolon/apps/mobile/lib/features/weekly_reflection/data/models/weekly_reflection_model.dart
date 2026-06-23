import 'package:eidolon/features/weekly_reflection/domain/entities/weekly_reflection.dart';

/// Maps a flat Supabase `weekly_reflections` row to [WeeklyReflection].
class WeeklyReflectionModel {
  static WeeklyReflection fromRow(Map<String, dynamic> row) {
    return WeeklyReflection(
      id: row['id'] as String,
      weekStart: DateTime.parse(row['week_start'] as String),
      reflection: (row['reflection'] as String?) ?? '',
      observation: (row['observation'] as String?) ?? '',
      nudge: (row['nudge'] as String?) ?? '',
      seen: row['seen_at'] != null,
    );
  }
}
