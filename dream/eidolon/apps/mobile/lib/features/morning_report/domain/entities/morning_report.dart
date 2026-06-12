import 'package:shared_types/shared_types.dart';

/// Rarity tier for overnight loot. Self-contained so Morning Report does not
/// couple to the gacha feature.
enum LootRarity {
  common,
  rare,
  epic,
  legendary;

  static LootRarity fromString(String? v) => switch (v) {
        'rare' => LootRarity.rare,
        'epic' => LootRarity.epic,
        'legendary' => LootRarity.legendary,
        _ => LootRarity.common,
      };
}

/// A single item the Eidolon brought back from its overnight venture.
class OvernightLoot {
  const OvernightLoot({required this.name, required this.rarity});
  final String name;
  final LootRarity rarity;
}

/// The result of one autonomous overnight run — the "Morning Report" the player
/// wakes up to. Mirrors a row of `overnight_runs`.
class MorningReport {
  const MorningReport({
    required this.id,
    required this.runDate,
    required this.theme,
    required this.narrative,
    required this.highlight,
    required this.mood,
    required this.xpGained,
    required this.loot,
    required this.seen,
  });

  final String id;
  final DateTime runDate;
  final String theme;
  final String narrative;
  final String highlight;
  final EidolonMood mood;
  final int xpGained;
  final List<OvernightLoot> loot;
  final bool seen;
}
