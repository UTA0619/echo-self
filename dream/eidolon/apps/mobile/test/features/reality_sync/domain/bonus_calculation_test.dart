import 'package:eidolon/features/reality_sync/domain/entities/health_snapshot.dart';
import 'package:eidolon/features/reality_sync/domain/entities/reality_sync_bonus.dart';
import 'package:flutter_test/flutter_test.dart';

HealthSnapshot _snap({
  int steps = 0,
  double sleep = 0,
  double calories = 0,
}) =>
    HealthSnapshot(
      stepsToday: steps,
      sleepHoursLast: sleep,
      caloriesBurned: calories,
      fetchedAt: DateTime(2026, 1, 1),
    );

void main() {
  group('bonusFromSnapshot — ATK', () {
    test('0 steps → ATK 0', () {
      expect(bonusFromSnapshot(_snap(steps: 0)).atkBonus, 0);
    });

    test('1000 steps → ATK 2', () {
      expect(bonusFromSnapshot(_snap(steps: 1000)).atkBonus, 2);
    });

    test('5000 steps → ATK 10', () {
      expect(bonusFromSnapshot(_snap(steps: 5000)).atkBonus, 10);
    });

    test('10000 steps → ATK 20 (max)', () {
      expect(bonusFromSnapshot(_snap(steps: 10000)).atkBonus, 20);
    });

    test('20000 steps → ATK capped at 20', () {
      expect(bonusFromSnapshot(_snap(steps: 20000)).atkBonus, 20);
    });
  });

  group('bonusFromSnapshot — HP', () {
    test('0h sleep → HP 0', () {
      expect(bonusFromSnapshot(_snap(sleep: 0)).hpPercent, 0);
    });

    test('4.9h sleep → HP 0', () {
      expect(bonusFromSnapshot(_snap(sleep: 4.9)).hpPercent, 0);
    });

    test('5h sleep → HP 50', () {
      expect(bonusFromSnapshot(_snap(sleep: 5.0)).hpPercent, 50);
    });

    test('6h sleep → HP 50', () {
      expect(bonusFromSnapshot(_snap(sleep: 6.0)).hpPercent, 50);
    });

    test('7h sleep → HP 100', () {
      expect(bonusFromSnapshot(_snap(sleep: 7.0)).hpPercent, 100);
    });

    test('8h sleep → HP 100', () {
      expect(bonusFromSnapshot(_snap(sleep: 8.0)).hpPercent, 100);
    });
  });

  group('bonusFromSnapshot — EXP', () {
    test('0 kcal → EXP 0', () {
      expect(bonusFromSnapshot(_snap(calories: 0)).expBonus, 0);
    });

    test('100 kcal → EXP 5', () {
      expect(bonusFromSnapshot(_snap(calories: 100)).expBonus, 5);
    });

    test('500 kcal → EXP 25', () {
      expect(bonusFromSnapshot(_snap(calories: 500)).expBonus, 25);
    });

    test('1000 kcal → EXP 50 (max)', () {
      expect(bonusFromSnapshot(_snap(calories: 1000)).expBonus, 50);
    });

    test('2000 kcal → EXP capped at 50', () {
      expect(bonusFromSnapshot(_snap(calories: 2000)).expBonus, 50);
    });
  });

  group('bonusFromSnapshot — syncScore', () {
    test('zero activity → score 0', () {
      expect(bonusFromSnapshot(_snap()).syncScore, 0);
    });

    test('max activity → score 100', () {
      final b =
          bonusFromSnapshot(_snap(steps: 10000, sleep: 8, calories: 1000));
      expect(b.syncScore, 100);
    });

    test('partial activity is proportional', () {
      // ATK=10(50% of 40=20), HP=100(100% of 40=40), EXP=0 → 20+40+0=60
      final b = bonusFromSnapshot(_snap(steps: 5000, sleep: 7, calories: 0));
      expect(b.syncScore, 60);
    });
  });
}
