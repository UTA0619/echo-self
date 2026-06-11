import 'package:eidolon/features/eidolon/data/models/eidolon_model.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_types/shared_types.dart';

Map<String, dynamic> _fullRow() => {
      'id': 'eid-1',
      'user_id': 'usr-1',
      'name': 'Nyx',
      'level': 7,
      'xp': 1234,
      'xp_to_next': 2000,
      'openness': 80,
      'conscientiousness': 65,
      'extraversion': 40,
      'agreeableness': 72,
      'neuroticism': 30,
      'base_atk': 25,
      'base_def': 18,
      'base_hp': 220,
      'base_mp': 90,
      'current_mood': 'excited',
      'auto_strategy': 'aggressive',
      'appearance': {'hue': 200},
      'created_at': '2026-06-01T00:00:00Z',
      'updated_at': '2026-06-02T12:00:00Z',
    };

void main() {
  group('EidolonModel.fromRow', () {
    test('maps a full row into an EidolonProfile', () {
      final p = EidolonModel.fromRow(_fullRow());

      expect(p.id, 'eid-1');
      expect(p.userId, 'usr-1');
      expect(p.name, 'Nyx');
      expect(p.level, 7);
      expect(p.xp, 1234);
      expect(p.xpToNext, 2000);
      expect(p.baseAtk, 25);
      expect(p.baseDef, 18);
      expect(p.baseHp, 220);
      expect(p.baseMp, 90);
      expect(p.currentMood, EidolonMood.excited);
      expect(p.autoStrategy, 'aggressive');
      expect(p.appearance['hue'], 200);
      expect(p.createdAt, DateTime.utc(2026, 6, 1));
      expect(p.updatedAt, DateTime.utc(2026, 6, 2, 12));
    });

    test('nests the Big Five columns into PersonalityProfile', () {
      final p = EidolonModel.fromRow(_fullRow());

      expect(p.personality.openness, 80);
      expect(p.personality.conscientiousness, 65);
      expect(p.personality.extraversion, 40);
      expect(p.personality.agreeableness, 72);
      expect(p.personality.neuroticism, 30);
    });

    test('applies sensible defaults when optional columns are missing', () {
      final p = EidolonModel.fromRow({
        'id': 'eid-2',
        'user_id': 'usr-2',
        'name': 'Echo',
        'created_at': '2026-06-01T00:00:00Z',
        'updated_at': '2026-06-01T00:00:00Z',
      });

      expect(p.level, 1);
      expect(p.xp, 0);
      expect(p.xpToNext, 1000);
      expect(p.baseAtk, 10);
      expect(p.baseDef, 10);
      expect(p.baseHp, 100);
      expect(p.baseMp, 50);
      expect(p.currentMood, EidolonMood.calm);
      expect(p.autoStrategy, 'balanced');
      expect(p.appearance, isEmpty);
      // Defaults for the Big Five sit at the neutral midpoint.
      expect(p.personality.openness, 50);
      expect(p.personality.neuroticism, 50);
    });

    test('coerces numeric columns arriving as doubles', () {
      final row = _fullRow()
        ..['level'] = 9.0
        ..['xp'] = 50.0
        ..['openness'] = 77.0;

      final p = EidolonModel.fromRow(row);

      expect(p.level, 9);
      expect(p.xp, 50);
      expect(p.personality.openness, 77);
    });
  });
}
