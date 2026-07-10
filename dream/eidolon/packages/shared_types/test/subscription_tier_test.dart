import 'package:flutter_test/flutter_test.dart';
import 'package:shared_types/shared_types.dart';

void main() {
  group('SubscriptionTier — relationship model (STRATEGY §6)', () {
    test('free runs on the cheap model; paid tiers get the better one', () {
      // This is the unit-economics fix: heavy compute is spent on payers.
      expect(SubscriptionTier.free.cognitionModel, 'claude-haiku-4-5');
      expect(SubscriptionTier.soulPass.cognitionModel, 'claude-sonnet-4-5');
      expect(SubscriptionTier.eternal.cognitionModel, 'claude-sonnet-4-5');
    });

    test('a deeper bond buys a longer memory horizon', () {
      expect(SubscriptionTier.free.memoryHorizonDays, 30);
      expect(SubscriptionTier.soulPass.memoryHorizonDays, 180);
      expect(SubscriptionTier.eternal.memoryHorizonDays, -1); // unlimited
    });

    test('reflections and customization are paid-only relationship perks', () {
      expect(SubscriptionTier.free.weeklyReflections, false);
      expect(SubscriptionTier.free.customizationUnlocked, false);
      for (final t in [SubscriptionTier.soulPass, SubscriptionTier.eternal]) {
        expect(t.weeklyReflections, true);
        expect(t.customizationUnlocked, true);
      }
    });

    test('paid value is monotonic in the relationship, not in power', () {
      // Memory horizon never shrinks as you pay more (unlimited == -1 sentinel).
      int horizon(SubscriptionTier t) =>
          t.memoryHorizonDays == -1 ? 1 << 30 : t.memoryHorizonDays;
      expect(
        horizon(SubscriptionTier.soulPass) >= horizon(SubscriptionTier.free),
        true,
      );
      expect(
        horizon(SubscriptionTier.eternal) >= horizon(SubscriptionTier.soulPass),
        true,
      );
    });

    test('fromValue is forgiving of legacy/unknown strings', () {
      expect(
          SubscriptionTier.fromValue('soul_pass'), SubscriptionTier.soulPass);
      expect(SubscriptionTier.fromValue('mystery'), SubscriptionTier.free);
    });
  });
}
