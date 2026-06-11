import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/home/data/datasources/home_supabase_datasource.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers/supabase_queue.dart';

HomeSupabaseDataSource _ds(SupabaseQueue q) =>
    HomeSupabaseDataSource(q.buildClient());

final _userRow = {
  'id': 'usr-1',
  'auth_uid': 'auth-1',
  'username': 'shadow',
  'display_name': 'Shadow',
  'avatar_url': null,
  'timezone': 'Asia/Tokyo',
  'language': 'ja',
  'subscription_tier': 'soul_pass',
  'health_sync_enabled': true,
  'emotion_log_enabled': false,
  'created_at': '2026-06-01T00:00:00Z',
  'last_active': '2026-06-02T00:00:00Z',
};

void main() {
  group('getPlayerProfile', () {
    test('maps the users row into a PlayerProfile', () async {
      final q = SupabaseQueue()..enqueue(200, _userRow);

      final result = await _ds(q).getPlayerProfile('auth-1');

      expect(result.error, isNull);
      final p = result.value!;
      expect(p.id, 'usr-1');
      expect(p.username, 'shadow');
      expect(p.language, 'ja');
      expect(p.healthSyncEnabled, isTrue);
      expect(p.tier.value, 'soul_pass');
      expect(q.requests.single.url.queryParameters['auth_uid'], 'eq.auth-1');
    });

    test('an unknown subscription tier falls back to free (no crash)',
        () async {
      final q = SupabaseQueue()
        ..enqueue(200, {..._userRow, 'subscription_tier': 'legacy_gold'});

      final result = await _ds(q).getPlayerProfile('auth-1');

      expect(result.error, isNull);
      expect(result.value!.tier.value, 'free');
    });

    test('failure → NetworkError', () async {
      final q = SupabaseQueue()..enqueue(500, pgError);

      final result = await _ds(q).getPlayerProfile('auth-1');

      expect(result.error, isA<NetworkError>());
    });
  });

  group('getHomeSummary', () {
    test('counts today runs and flags the active one', () async {
      final q = SupabaseQueue()
        ..enqueue(200, [
          {
            'id': 'run-1',
            'run_status': 'completed',
            'started_at': '2026-06-01T08:00:00',
          },
          {
            'id': 'run-2',
            'run_status': 'in_progress',
            'started_at': '2026-06-01T09:00:00',
          },
        ]);

      final result = await _ds(q).getHomeSummary('eid-1');

      expect(result.error, isNull);
      final s = result.value!;
      expect(s.dungeonRunsToday, 2);
      expect(s.hasActiveRun, isTrue);
      expect(s.activeRunId, 'run-2');

      final params = q.requests.single.url.queryParameters;
      expect(params['eidolon_id'], 'eq.eid-1');
      expect(params['started_at'], isNotNull);
    });

    test('no runs today → zero count, no active run', () async {
      final q = SupabaseQueue()..enqueue(200, const []);

      final result = await _ds(q).getHomeSummary('eid-1');

      expect(result.error, isNull);
      expect(result.value!.dungeonRunsToday, 0);
      expect(result.value!.hasActiveRun, isFalse);
      expect(result.value!.activeRunId, isNull);
    });

    test('failure → NetworkError', () async {
      final q = SupabaseQueue()..enqueue(500, pgError);

      final result = await _ds(q).getHomeSummary('eid-1');

      expect(result.error, isA<NetworkError>());
    });
  });
}
