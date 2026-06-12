import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/eidolon/data/datasources/eidolon_supabase_datasource.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_types/shared_types.dart';

import '../../home/data/helpers/supabase_queue.dart';

EidolonSupabaseDataSource _ds(SupabaseQueue q) =>
    EidolonSupabaseDataSource(q.buildClient());

Map<String, dynamic> _memoryRow(String id, {double importance = 0.5}) => {
      'id': id,
      'eidolon_id': 'eid-1',
      'memory_type': 'episodic',
      'content': 'Fought a shadow beast in the glade.',
      'importance': importance,
      'emotion_tag': 'fear',
      'source': 'dungeon',
      'source_ref': 'run-1',
      'access_count': 3,
      'last_accessed': '2026-06-02T00:00:00Z',
      'created_at': '2026-06-01T00:00:00Z',
    };

void main() {
  group('getEidolonForCurrentUser', () {
    test('returns AuthError when no session is present', () async {
      // The MockClient-backed client has no authenticated user.
      final result = await _ds(SupabaseQueue()).getEidolonForCurrentUser();

      expect(result.error, isA<AuthError>());
      expect((result.error! as AuthError).message, 'Not authenticated');
    });
  });

  group('getRecentMemories', () {
    test('maps rows into MemoryEntry list, ordered query applied', () async {
      final q = SupabaseQueue()
        ..enqueue(200, [
          _memoryRow('mem-1', importance: 0.9),
          _memoryRow('mem-2', importance: 0.4),
        ]);

      final result = await _ds(q).getRecentMemories(eidolonId: 'eid-1');

      expect(result.error, isNull);
      expect(result.value, hasLength(2));
      expect(result.value!.first.id, 'mem-1');
      expect(result.value!.first.memoryType, MemoryType.episodic);
      expect(result.value!.first.emotionTag, 'fear');

      final params = q.requests.single.url.queryParameters;
      expect(params['eidolon_id'], 'eq.eid-1');
      expect(params['limit'], '20');
      // Two order keys: importance desc then created_at desc.
      expect(params['order'], contains('importance'));
    });

    test('respects a custom limit', () async {
      final q = SupabaseQueue()..enqueue(200, [_memoryRow('mem-1')]);

      await _ds(q).getRecentMemories(eidolonId: 'eid-1', limit: 5);

      expect(q.requests.single.url.queryParameters['limit'], '5');
    });

    test('failure → NetworkError', () async {
      final q = SupabaseQueue()..enqueue(500, pgError);

      final result = await _ds(q).getRecentMemories(eidolonId: 'eid-1');

      expect(result.error, isA<NetworkError>());
    });
  });
}
