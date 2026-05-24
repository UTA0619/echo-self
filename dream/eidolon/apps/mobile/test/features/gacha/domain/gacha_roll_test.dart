import 'package:eidolon/features/gacha/domain/entities/gacha_item.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_pull_result.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('GachaRarity', () {
    test('weights sum to 10000', () {
      final total = GachaRarity.values.fold<int>(0, (s, r) => s + r.weight);
      expect(total, 10000);
    });

    test('legendary has lowest weight', () {
      expect(GachaRarity.legendary.weight, lessThan(GachaRarity.epic.weight));
      expect(GachaRarity.epic.weight, lessThan(GachaRarity.rare.weight));
      expect(GachaRarity.rare.weight, lessThan(GachaRarity.common.weight));
    });
  });

  group('kGachaCatalog', () {
    test('has items for every rarity', () {
      for (final rarity in GachaRarity.values) {
        expect(
          kGachaCatalog.any((i) => i.rarity == rarity),
          true,
          reason: 'No $rarity items in catalog',
        );
      }
    });

    test('all item IDs are unique', () {
      final ids = kGachaCatalog.map((i) => i.id).toSet();
      expect(ids.length, kGachaCatalog.length);
    });

    test('no item has empty name or description', () {
      for (final item in kGachaCatalog) {
        expect(item.name, isNotEmpty, reason: '${item.id} has empty name');
        expect(
          item.description,
          isNotEmpty,
          reason: '${item.id} has empty description',
        );
      }
    });
  });

  group('kSinglePullCost / kTenPullCost', () {
    test('10-pull costs less than 10 × single-pull', () {
      expect(kTenPullCost, lessThan(kSinglePullCost * 10));
    });

    test('single pull cost is 100', () {
      expect(kSinglePullCost, 100);
    });

    test('ten pull cost is 900', () {
      expect(kTenPullCost, 900);
    });
  });

  group('GachaPullResult', () {
    test('crystalsSpent equals single cost for 1 item', () {
      final result = GachaPullResult(
        items: [kGachaCatalog.first],
        pulledAt: DateTime.now(),
        crystalsSpent: kSinglePullCost,
      );
      expect(result.crystalsSpent, kSinglePullCost);
      expect(result.items.length, 1);
    });

    test('crystalsSpent equals ten cost for 10 items', () {
      final items = List.generate(10, (i) => kGachaCatalog[i % kGachaCatalog.length]);
      final result = GachaPullResult(
        items: items,
        pulledAt: DateTime.now(),
        crystalsSpent: kTenPullCost,
      );
      expect(result.crystalsSpent, kTenPullCost);
      expect(result.items.length, 10);
    });
  });
}
