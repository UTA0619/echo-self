import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/dungeon/data/datasources/dungeon_generate_datasource.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_types/shared_types.dart';

import '../../home/data/helpers/supabase_queue.dart';

DungeonGenerateDataSource _ds(SupabaseQueue q) =>
    DungeonGenerateDataSource(q.buildClient());

void main() {
  group('generate', () {
    test('maps a 200 edge-function payload into a DungeonGenerateResult',
        () async {
      final q = SupabaseQueue()
        ..enqueue(200, {
          'dungeonId': 'dun-9',
          'name': 'Hollow of Echoes',
          'narrativeIntro': 'A cold wind greets you.',
          'rooms': [
            {'index': 0, 'description': 'Entry', 'eventType': 'story'},
            {'index': 1, 'description': 'A trap!', 'eventType': 'combat'},
          ],
          'bossConfig': {'name': 'The Hollow King'},
          'modelUsed': 'claude-sonnet-4.5',
          'generationMs': 2100,
        });

      final result = await _ds(q).generate(
        eidolonId: 'eid-1',
        difficulty: 4,
        theme: DungeonTheme.cave,
      );

      expect(result.error, isNull);
      final res = result.value!;
      expect(res.dungeon.id, 'dun-9');
      expect(res.dungeon.name, 'Hollow of Echoes');
      expect(res.dungeon.difficulty, 4);
      expect(res.dungeon.theme, DungeonTheme.cave);
      expect(res.dungeon.rooms, hasLength(2));
      expect(res.dungeon.bossConfig['name'], 'The Hollow King');
      expect(res.modelUsed, 'claude-sonnet-4.5');
      expect(res.generationMs, 2100);

      final req = q.requests.single;
      expect(req.url.path, endsWith('/functions/v1/dungeon-generate'));
    });

    test('defaults theme to forest and rooms to empty when omitted', () async {
      final q = SupabaseQueue()..enqueue(200, {'dungeonId': 'dun-1'});

      final result = await _ds(q).generate(eidolonId: 'eid-1');

      expect(result.error, isNull);
      expect(result.value!.dungeon.theme, DungeonTheme.forest);
      expect(result.value!.dungeon.rooms, isEmpty);
      expect(result.value!.dungeon.name, 'Unnamed Dungeon');
      expect(result.value!.modelUsed, 'unknown');
    });

    test('non-200 status → NetworkError', () async {
      final q = SupabaseQueue()..enqueue(503, {'message': 'overloaded'});

      final result = await _ds(q).generate(eidolonId: 'eid-1');

      expect(result.error, isA<NetworkError>());
      expect((result.error! as NetworkError).statusCode, 503);
    });
  });
}
