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

/// Gacha rewards are identity expression — never gameplay power (Doctrine D3).
/// Crystals are bought with real money, so every reward MUST be cosmetic, an
/// ambient effect, or story/lore. Enforced by no_power_for_pay_test.dart.
enum GachaCategory { cosmetic, aura, story }

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

/// The canonical item catalog — cosmetic / aura / story ONLY (D3, GDD §7).
/// In production this would come from Supabase. Ids + rarities are stable
/// (rarity drives pull weights and is persisted); names/descriptions express
/// identity and lore, and grant no gameplay advantage.
const kGachaCatalog = [
  // ── Legendary ─────────────────────────────────────────────────────────────
  GachaItem(
    id: 'leg_001',
    name: 'Soul Resonance',
    description:
        'A shimmering soul-aura that haloes your Eidolon in resonant light. '
        'Cosmetic — a rare look that says how far you two have come.',
    rarity: GachaRarity.legendary,
    category: GachaCategory.aura,
    iconEmoji: '✨',
  ),
  GachaItem(
    id: 'leg_002',
    name: 'Chrono Mantle',
    description:
        'A flowing mantle woven from captured starlight. A legendary cosmetic '
        'look for your Eidolon — purely ornamental.',
    rarity: GachaRarity.legendary,
    category: GachaCategory.cosmetic,
    iconEmoji: '🌌',
  ),
  GachaItem(
    id: 'leg_003',
    name: 'Void Memory',
    description:
        'A fragment from a forgotten timeline. Unlocks a hidden chapter of your '
        "Eidolon's past — a story, not a stat.",
    rarity: GachaRarity.legendary,
    category: GachaCategory.story,
    iconEmoji: '🌀',
  ),
  // ── Epic ──────────────────────────────────────────────────────────────────
  GachaItem(
    id: 'epc_001',
    name: 'Phantom Step',
    description:
        'A ghostly afterimage trail that follows your Eidolon as it moves. '
        'A cosmetic flourish, nothing more.',
    rarity: GachaRarity.epic,
    category: GachaCategory.aura,
    iconEmoji: '👻',
  ),
  GachaItem(
    id: 'epc_002',
    name: 'Astral Regalia',
    description:
        'Ceremonial astral plating worn for show. A striking cosmetic look that '
        'changes nothing in battle.',
    rarity: GachaRarity.epic,
    category: GachaCategory.cosmetic,
    iconEmoji: '🪽',
  ),
  GachaItem(
    id: 'epc_003',
    name: 'Dream Fragment',
    description:
        "Unlocks a tender hidden memory of your Eidolon's past life. Pure lore.",
    rarity: GachaRarity.epic,
    category: GachaCategory.story,
    iconEmoji: '💭',
  ),
  GachaItem(
    id: 'epc_004',
    name: 'Thunder Sigil',
    description:
        'A crackling lightning aura that arcs gently around your Eidolon. '
        'A visual flourish only.',
    rarity: GachaRarity.epic,
    category: GachaCategory.aura,
    iconEmoji: '⚡',
  ),
  // ── Rare ──────────────────────────────────────────────────────────────────
  GachaItem(
    id: 'rar_001',
    name: 'Ember Crown',
    description:
        'A smouldering crown of soft embers that hovers above your Eidolon. '
        'Cosmetic regalia.',
    rarity: GachaRarity.rare,
    category: GachaCategory.cosmetic,
    iconEmoji: '🔥',
  ),
  GachaItem(
    id: 'rar_002',
    name: 'Shadow Cloak',
    description:
        'A cosmetic cloak of living shadow. It looks wonderful and does nothing '
        'else.',
    rarity: GachaRarity.rare,
    category: GachaCategory.cosmetic,
    iconEmoji: '🌑',
  ),
  GachaItem(
    id: 'rar_003',
    name: 'Echo Shard',
    description:
        'A resonance crystal that surfaces a fond shared memory the next time '
        'you talk. A story keepsake.',
    rarity: GachaRarity.rare,
    category: GachaCategory.story,
    iconEmoji: '💎',
  ),
  GachaItem(
    id: 'rar_004',
    name: 'Tidal Glow',
    description:
        'A soothing tidal shimmer that washes over your Eidolon at rest. '
        'Ambient cosmetic.',
    rarity: GachaRarity.rare,
    category: GachaCategory.aura,
    iconEmoji: '💧',
  ),
  GachaItem(
    id: 'rar_005',
    name: "Dreamer's Tome",
    description:
        "An illustrated tome of your Eidolon's invented bedtime tales. Flavour "
        'lore to read, with no effect on play.',
    rarity: GachaRarity.rare,
    category: GachaCategory.story,
    iconEmoji: '📖',
  ),
  // ── Common ────────────────────────────────────────────────────────────────
  GachaItem(
    id: 'com_001',
    name: 'Vial Charm',
    description:
        'A bubbling little vial charm that dangles at your Eidolon’s side. '
        'Decorative trinket.',
    rarity: GachaRarity.common,
    category: GachaCategory.cosmetic,
    iconEmoji: '🧪',
  ),
  GachaItem(
    id: 'com_002',
    name: 'Practice Blade',
    description:
        'A carved wooden practice blade your Eidolon carries for fun. Purely '
        'cosmetic prop.',
    rarity: GachaRarity.common,
    category: GachaCategory.cosmetic,
    iconEmoji: '🗡️',
  ),
  GachaItem(
    id: 'com_003',
    name: 'Focus Rune',
    description:
        'A faint runic glow that traces the ground beneath your Eidolon. '
        'Cosmetic ambiance.',
    rarity: GachaRarity.common,
    category: GachaCategory.aura,
    iconEmoji: '🔮',
  ),
  GachaItem(
    id: 'com_004',
    name: 'Memory Dust',
    description:
        'A faded memory shard. Collect a few to piece together a short, gentle '
        'side-tale.',
    rarity: GachaRarity.common,
    category: GachaCategory.story,
    iconEmoji: '✦',
  ),
  GachaItem(
    id: 'com_005',
    name: 'Crest Emblem',
    description:
        'A heraldic crest your Eidolon proudly displays. Ornamental only.',
    rarity: GachaRarity.common,
    category: GachaCategory.cosmetic,
    iconEmoji: '🛡',
  ),
];
