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

  // The only D3-safe categories: identity expression + ambient effects + lore.
  const safeCategories = {
    GachaCategory.cosmetic,
    GachaCategory.aura,
    GachaCategory.story,
  };

  test('no gacha reward grants gameplay power (D3)', () {
    final offenders = kGachaCatalog.where(grantsPower).toList();
    final report = offenders
        .map((o) => '  • ${o.id} "${o.name}" — ${o.description}')
        .join('\n');
    expect(
      offenders,
      isEmpty,
      reason: 'D3 violation: ${offenders.length}/${kGachaCatalog.length} gacha '
          'items grant power. Gacha must be cosmetic/story/convenience only.\n$report',
    );
  });

  test('every gacha reward is in a D3-safe category', () {
    final unsafe = kGachaCatalog
        .where((i) => !safeCategories.contains(i.category))
        .toList();
    expect(
      unsafe,
      isEmpty,
      reason: 'D3: ${unsafe.length} items use a non-cosmetic/story category.',
    );
  });
}
