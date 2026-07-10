import 'package:flutter_test/flutter_test.dart';
import 'package:shared_types/shared_types.dart';

void main() {
  EidolonProfile base() => EidolonProfile(
        id: 'e1',
        userId: 'u1',
        name: 'Aria',
        personality: const PersonalityProfile(),
        createdAt: DateTime.utc(2026, 1, 1),
        updatedAt: DateTime.utc(2026, 1, 1),
      );

  group('EidolonProfile.gainXp progression', () {
    test('xp below the threshold accrues without a level-up', () {
      final e = base().gainXp(100);
      expect(e.level, 1);
      expect(e.xp, 100);
      expect(e.baseAtk, 10);
      expect(e.xpToNext, EidolonProfile.xpToNextForLevel(1));
    });

    test('reaching the threshold levels up once and grows stats', () {
      final e = base().gainXp(EidolonProfile.xpToNextForLevel(1));
      expect(e.level, 2);
      expect(e.xp, 0);
      expect(e.baseAtk, 13); // +3
      expect(e.baseHp, 125); // +25
      expect(e.xpToNext, EidolonProfile.xpToNextForLevel(2));
    });

    test('a large grant cascades multiple level-ups', () {
      final l1 = EidolonProfile.xpToNextForLevel(1);
      final l2 = EidolonProfile.xpToNextForLevel(2);
      final e = base().gainXp(l1 + l2 + 50);
      expect(e.level, 3);
      expect(e.xp, 50);
      expect(e.baseAtk, 16); // +3 per level
    });

    test('non-positive amounts are a no-op', () {
      expect(base().gainXp(0).level, 1);
      expect(base().gainXp(-100).xp, 0);
    });
  });

  group('EidolonProfile guardrails (D6)', () {
    test('conservative defaults when unset', () {
      final e = base();
      expect(e.riskTolerance, 40);
      expect(e.socialOpenness, 30);
    });

    // Mirrors how rows actually arrive (a JSON map from the data layer), since the
    // entity does not use explicitToJson for the nested personality object.
    Map<String, dynamic> jsonRow({Object? risk, Object? social}) => {
          'id': 'e1',
          'userId': 'u1',
          'name': 'Aria',
          'personality': {
            'openness': 50,
            'conscientiousness': 50,
            'extraversion': 50,
            'agreeableness': 50,
            'neuroticism': 50,
          },
          if (risk != null) 'riskTolerance': risk,
          if (social != null) 'socialOpenness': social,
          'createdAt': '2026-01-01T00:00:00.000Z',
          'updatedAt': '2026-01-01T00:00:00.000Z',
        };

    test('deserializes guardrails from a JSON row', () {
      final e = EidolonProfile.fromJson(jsonRow(risk: 70, social: 55));
      expect(e.riskTolerance, 70);
      expect(e.socialOpenness, 55);
    });

    test('missing JSON keys fall back to defaults (back-compat with old rows)', () {
      final e = EidolonProfile.fromJson(jsonRow());
      expect(e.riskTolerance, 40);
      expect(e.socialOpenness, 30);
    });

    test('safe getters clamp out-of-range values to 0-100', () {
      final e = base().copyWith(riskTolerance: 999, socialOpenness: -10);
      expect(e.safeRiskTolerance, 100);
      expect(e.safeSocialOpenness, 0);
    });
  });
}
