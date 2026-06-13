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
