import 'package:freezed_annotation/freezed_annotation.dart';

part 'gacha_item.freezed.dart';

enum GachaRarity { common, rare, epic, legendary }

extension GachaRarityX on GachaRarity {
  String get label => switch (this) {
        GachaRarity.common => 'Common',
        GachaRarity.rare => 'Rare',
        GachaRarity.epic => 'Epic',
        GachaRarity.legendary => 'Legendary',
      };

  /// Pull weight out of 10000 for weighted random selection.
  int get weight => switch (this) {
        GachaRarity.common => 7400,
        GachaRarity.rare => 2000,
        GachaRarity.epic => 500,
        GachaRarity.legendary => 100,
      };
}

enum GachaCategory { skill, equipment, memoryFragment }

@freezed
abstract class GachaItem with _$GachaItem {
  const factory GachaItem({
    required String id,
    required String name,
    required String description,
    required GachaRarity rarity,
    required GachaCategory category,
    required String iconEmoji,
  }) = _GachaItem;
}

/// The canonical item catalog. In production this would come from Supabase.
const kGachaCatalog = [
  // ── Legendary ─────────────────────────────────────────────────────────────
  GachaItem(
    id: 'leg_001',
    name: 'Soul Resonance',
    description: 'Your Eidolon\'s bond deepens permanently. +15 to all stats.',
    rarity: GachaRarity.legendary,
    category: GachaCategory.skill,
    iconEmoji: '✨',
  ),
  GachaItem(
    id: 'leg_002',
    name: 'Chrono Blade',
    description: 'A weapon that slows time. ATK +50, SPD +20.',
    rarity: GachaRarity.legendary,
    category: GachaCategory.equipment,
    iconEmoji: '⚔️',
  ),
  GachaItem(
    id: 'leg_003',
    name: 'Void Memory',
    description: 'A fragment from a forgotten timeline. Unlocks secret dungeon.',
    rarity: GachaRarity.legendary,
    category: GachaCategory.memoryFragment,
    iconEmoji: '🌀',
  ),
  // ── Epic ──────────────────────────────────────────────────────────────────
  GachaItem(
    id: 'epc_001',
    name: 'Phantom Step',
    description: 'Dodge rate +25%. Evade the first hit in any dungeon.',
    rarity: GachaRarity.epic,
    category: GachaCategory.skill,
    iconEmoji: '👻',
  ),
  GachaItem(
    id: 'epc_002',
    name: 'Astral Armor',
    description: 'DEF +40. Resists dark-type damage by 50%.',
    rarity: GachaRarity.epic,
    category: GachaCategory.equipment,
    iconEmoji: '🛡️',
  ),
  GachaItem(
    id: 'epc_003',
    name: 'Dream Fragment',
    description: 'Unlock a hidden memory of your Eidolon\'s past life.',
    rarity: GachaRarity.epic,
    category: GachaCategory.memoryFragment,
    iconEmoji: '💭',
  ),
  GachaItem(
    id: 'epc_004',
    name: 'Thunder Sigil',
    description: 'Lightning magic. 30% chance to stun enemies for 1 turn.',
    rarity: GachaRarity.epic,
    category: GachaCategory.skill,
    iconEmoji: '⚡',
  ),
  // ── Rare ──────────────────────────────────────────────────────────────────
  GachaItem(
    id: 'rar_001',
    name: 'Iron Will',
    description: 'HP +200. First death in a run is negated once per day.',
    rarity: GachaRarity.rare,
    category: GachaCategory.skill,
    iconEmoji: '🔥',
  ),
  GachaItem(
    id: 'rar_002',
    name: 'Shadow Cloak',
    description: 'AGI +15. Enemies have 10% reduced detection range.',
    rarity: GachaRarity.rare,
    category: GachaCategory.equipment,
    iconEmoji: '🌑',
  ),
  GachaItem(
    id: 'rar_003',
    name: 'Echo Shard',
    description: 'A resonance crystal. Your Eidolon gains 1 extra chat per day.',
    rarity: GachaRarity.rare,
    category: GachaCategory.memoryFragment,
    iconEmoji: '💎',
  ),
  GachaItem(
    id: 'rar_004',
    name: 'Healing Tide',
    description: 'Recover 15% HP at the start of each dungeon floor.',
    rarity: GachaRarity.rare,
    category: GachaCategory.skill,
    iconEmoji: '💧',
  ),
  GachaItem(
    id: 'rar_005',
    name: 'Mage\'s Tome',
    description: 'INT +20. Magic damage increased by 15%.',
    rarity: GachaRarity.rare,
    category: GachaCategory.equipment,
    iconEmoji: '📖',
  ),
  // ── Common ────────────────────────────────────────────────────────────────
  GachaItem(
    id: 'com_001',
    name: 'HP Potion',
    description: 'Restores 100 HP when used inside a dungeon.',
    rarity: GachaRarity.common,
    category: GachaCategory.equipment,
    iconEmoji: '🧪',
  ),
  GachaItem(
    id: 'com_002',
    name: 'Basic Sword',
    description: 'ATK +5. A sturdy blade for early dungeons.',
    rarity: GachaRarity.common,
    category: GachaCategory.equipment,
    iconEmoji: '🗡️',
  ),
  GachaItem(
    id: 'com_003',
    name: 'Focus Rune',
    description: 'EXP gain +5% for the next dungeon run.',
    rarity: GachaRarity.common,
    category: GachaCategory.skill,
    iconEmoji: '🔮',
  ),
  GachaItem(
    id: 'com_004',
    name: 'Memory Dust',
    description: 'A faded memory shard. Fuse 5 to form an Echo Shard.',
    rarity: GachaRarity.common,
    category: GachaCategory.memoryFragment,
    iconEmoji: '✦',
  ),
  GachaItem(
    id: 'com_005',
    name: 'Iron Shield',
    description: 'DEF +8. Reduces physical damage by 5%.',
    rarity: GachaRarity.common,
    category: GachaCategory.equipment,
    iconEmoji: '🛡',
  ),
];
