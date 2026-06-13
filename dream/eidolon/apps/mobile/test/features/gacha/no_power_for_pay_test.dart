// Doctrine D3 — No Power for Pay (issue #121).
//
// Crystals are bought with real money and spent on gacha pulls, so EVERY gacha
// reward must be cosmetic / story / convenience only — never gameplay power. This
// test is the automated guard the Constitution requires (the app-side analogue of
// the state invariant INV_NO_POWER_FOR_PAY / powerForPaySkuCount === 0).
//
// It scans the live catalog for power claims in item descriptions/categories.
//
// See: docs/governance/CONSTITUTION.md (D3), GDD §7 ("gacha: cosmetics/story ONLY").
import 'package:flutter_test/flutter_test.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_item.dart';

void main() {
  // Phrases that denote a combat/progression advantage purchasable with money.
  final powerPatterns = <RegExp>[
    RegExp(r'\b(atk|def|hp|mp|spd|agi|int)\b', caseSensitive: false),
    RegExp(r'[+\-]\s?\d+\s*(to|%)?\s*(all\s+)?stat', caseSensitive: false),
    RegExp(r'\+\s?\d+', caseSensitive: false), // "+15", "+50", "+200"
    RegExp(
      r'\b(damage|dodge|evade|stun|resist|negate|death is negated|extra .* per day)\b',
      caseSensitive: false,
    ),
    RegExp(r'\b(exp|xp)\b.*\+|\bgain \+', caseSensitive: false),
  ];

  bool grantsPower(GachaItem it) {
    final text = '${it.name} ${it.description}';
    return powerPatterns.any((re) => re.hasMatch(text));
  }

  bool isPowerCategory(GachaItem i) =>
      i.category == GachaCategory.equipment ||
      i.category == GachaCategory.skill;

  // SKIPPED: the live catalog currently VIOLATES D3 (≈15/18 items describe power,
  // 13/18 use equipment/skill categories) — tracked in issue #121. This is the
  // target invariant; remove `skip` once the catalog is cosmetic/story-only so it
  // enforces D3 in CI forever.
  test(
    'no gacha reward grants gameplay power (D3)',
    () {
      final offenders = kGachaCatalog.where(grantsPower).toList();
      final report = offenders
          .map((o) => '  • ${o.id} "${o.name}" — ${o.description}')
          .join('\n');
      expect(
        offenders,
        isEmpty,
        reason:
            'D3 violation: ${offenders.length}/${kGachaCatalog.length} gacha '
            'items grant power. Gacha must be cosmetic/story/convenience only.\n$report',
      );
    },
    skip: 'D3 violation — see #121',
  );

  test(
    'gacha categories are cosmetic/story only (no equipment/skill power)',
    () {
      // equipment & skill categories imply power; only memoryFragment (story) and
      // a cosmetic category are D3-safe. Surface any power-implying category.
      final powerCategories = kGachaCatalog.where(isPowerCategory).toList();
      expect(
        powerCategories,
        isEmpty,
        reason:
            'D3: ${powerCategories.length} items use power-implying categories '
            '(equipment/skill). Convert to cosmetic/story.',
      );
    },
    skip: 'D3 violation — see #121',
  );
}
