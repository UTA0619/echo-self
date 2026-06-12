import 'package:eidolon/features/morning_report/domain/entities/morning_report.dart';
import 'package:shared_types/shared_types.dart';

/// Maps a flat Supabase `overnight_runs` row to [MorningReport].
class MorningReportModel {
  static MorningReport fromRow(Map<String, dynamic> row) {
    final rawLoot = (row['loot'] as List<dynamic>?) ?? const [];
    final loot = rawLoot
        .whereType<Map<String, dynamic>>()
        .map(
          (e) => OvernightLoot(
            name: (e['name'] as String?) ?? '',
            rarity: LootRarity.fromString(e['rarity'] as String?),
          ),
        )
        .toList();

    return MorningReport(
      id: row['id'] as String,
      runDate: DateTime.parse(row['run_date'] as String),
      theme: (row['theme'] as String?) ?? '',
      narrative: (row['narrative'] as String?) ?? '',
      highlight: (row['highlight'] as String?) ?? '',
      mood: EidolonMood.fromString((row['mood'] as String?) ?? 'calm'),
      xpGained: (row['xp_gained'] as num?)?.toInt() ?? 0,
      loot: loot,
      seen: row['seen_at'] != null,
    );
  }
}
