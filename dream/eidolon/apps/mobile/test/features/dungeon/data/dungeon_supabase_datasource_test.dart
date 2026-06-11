import 'dart:convert';

import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/dungeon/data/datasources/dungeon_supabase_datasource.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_types/shared_types.dart';
import 'package:supabase_flutter/supabase_flutter.dart'
    hide AuthUser, OAuthProvider, User;

// ── Supabase via real builder chain + queued MockClient responses ─────────────

class _SupabaseQueue {
  final List<http.Request> requests = [];
  final List<(int, String)> _queue = [];

  void enqueue(int status, Object body) =>
      _queue.add((status, body is String ? body : jsonEncode(body)));

  SupabaseClient buildClient() {
    final mock = MockClient((request) async {
      requests.add(request);
      final (status, body) =
          _queue.isNotEmpty ? _queue.removeAt(0) : (200, '[]');
      // postgrest dereferences response.request!, so always attach it.
      return http.Response(body, status,
          request: request, headers: {'content-type': 'application/json'});
    });
    return SupabaseClient('http://localhost:54321', 'test-key',
        httpClient: mock);
  }
}

DungeonSupabaseDataSource _ds(_SupabaseQueue q) =>
    DungeonSupabaseDataSource(q.buildClient());

// ── Row fixtures ──────────────────────────────────────────────────────────────

final _dungeonRow = {
  'id': 'dun-1',
  'theme': 'forest',
  'difficulty': 3,
  'name': 'Whispering Glade',
  'narrative_intro': 'The trees remember you.',
  'layout': [
    {
      'index': 0,
      'description': 'A mossy clearing.',
      'eventType': 'story',
    },
    {
      'index': 1,
      'description': 'Something stirs.',
      'eventType': 'combat',
    },
  ],
  'boss_config': {'name': 'Eld Warden'},
  'created_at': '2026-06-01T00:00:00Z',
  'expires_at': '2026-06-02T00:00:00Z',
};

Map<String, dynamic> _runRow({
  String status = 'in_progress',
  int currentRoom = 0,
  String? endedAt,
}) =>
    {
      'id': 'run-1',
      'eidolon_id': 'eid-1',
      'dungeon_id': 'dun-1',
      'current_room': currentRoom,
      'run_status': status,
      'atk_bonus': 5,
      'hp_modifier': -2,
      'started_at': '2026-06-01T10:00:00Z',
      'ended_at': endedAt,
    };

const _pgError = {'message': 'row not found', 'code': '406'};

// ── Tests ─────────────────────────────────────────────────────────────────────

void main() {
  group('getDungeon', () {
    test('maps a full row into a Dungeon', () async {
      final q = _SupabaseQueue()..enqueue(200, _dungeonRow);

      final result = await _ds(q).getDungeon('dun-1');

      expect(result.error, isNull);
      final dungeon = result.value!;
      expect(dungeon.id, 'dun-1');
      expect(dungeon.theme, DungeonTheme.forest);
      expect(dungeon.difficulty, 3);
      expect(dungeon.rooms, hasLength(2));
      expect(dungeon.rooms.first.eventType, 'story');
      expect(dungeon.bossConfig['name'], 'Eld Warden');

      final req = q.requests.single;
      expect(req.method, 'GET');
      expect(req.url.path, endsWith('/dungeons'));
      expect(req.url.queryParameters['id'], 'eq.dun-1');
    });

    test('PostgrestException maps to NetworkError with parsed statusCode',
        () async {
      final q = _SupabaseQueue()..enqueue(406, _pgError);

      final result = await _ds(q).getDungeon('nope');

      expect(result.error, isA<NetworkError>());
      final e = result.error! as NetworkError;
      expect(e.message, 'row not found');
      expect(e.statusCode, 406);
    });

    test('malformed row (missing id) → UnknownError', () async {
      final q = _SupabaseQueue()..enqueue(200, {'name': 'broken'});

      final result = await _ds(q).getDungeon('dun-1');

      expect(result.error, isA<UnknownError>());
    });
  });

  group('startRun', () {
    test('inserts an in_progress run at room 0 and maps the returned row',
        () async {
      final q = _SupabaseQueue()..enqueue(201, _runRow());

      final result =
          await _ds(q).startRun(eidolonId: 'eid-1', dungeonId: 'dun-1');

      expect(result.error, isNull);
      expect(result.value!.id, 'run-1');
      expect(result.value!.status, RunStatus.inProgress);
      expect(result.value!.atkBonus, 5);

      final req = q.requests.single;
      expect(req.method, 'POST');
      expect(req.url.path, endsWith('/dungeon_runs'));
      final body = jsonDecode(req.body) as Map<String, dynamic>;
      expect(body['eidolon_id'], 'eid-1');
      expect(body['run_status'], 'in_progress');
      expect(body['current_room'], 0);
    });

    test('insert failure → NetworkError', () async {
      final q = _SupabaseQueue()..enqueue(409, _pgError);

      final result =
          await _ds(q).startRun(eidolonId: 'eid-1', dungeonId: 'dun-1');

      expect(result.error, isA<NetworkError>());
    });
  });

  group('getActiveRun', () {
    test('returns the newest in-progress run', () async {
      final q = _SupabaseQueue()..enqueue(200, [_runRow(currentRoom: 4)]);

      final result = await _ds(q).getActiveRun('eid-1');

      expect(result.error, isNull);
      expect(result.value!.currentRoom, 4);

      final params = q.requests.single.url.queryParameters;
      expect(params['eidolon_id'], 'eq.eid-1');
      expect(params['run_status'], 'eq.in_progress');
      expect(params['order'], contains('started_at'));
      expect(params['limit'], '1');
    });

    test('no active run → ok(null)', () async {
      final q = _SupabaseQueue()..enqueue(200, const []);

      final result = await _ds(q).getActiveRun('eid-1');

      expect(result.error, isNull);
      expect(result.value, isNull);
    });

    test('query failure → NetworkError', () async {
      final q = _SupabaseQueue()..enqueue(500, _pgError);

      final result = await _ds(q).getActiveRun('eid-1');

      expect(result.error, isA<NetworkError>());
    });
  });

  group('advanceRoom', () {
    test('reads current_room then updates to the next room', () async {
      final q = _SupabaseQueue()
        ..enqueue(200, {'current_room': 2})
        ..enqueue(200, _runRow(currentRoom: 3));

      final result = await _ds(q).advanceRoom('run-1');

      expect(result.error, isNull);
      expect(result.value!.currentRoom, 3);

      expect(q.requests, hasLength(2));
      expect(q.requests[0].method, 'GET');
      expect(q.requests[1].method, 'PATCH');
      final patchBody =
          jsonDecode(q.requests[1].body) as Map<String, dynamic>;
      expect(patchBody['current_room'], 3);
      expect(q.requests[1].url.queryParameters['id'], 'eq.run-1');
    });

    test('null current_room falls back to room 1', () async {
      final q = _SupabaseQueue()
        ..enqueue(200, {'current_room': null})
        ..enqueue(200, _runRow(currentRoom: 1));

      await _ds(q).advanceRoom('run-1');

      final patchBody =
          jsonDecode(q.requests[1].body) as Map<String, dynamic>;
      expect(patchBody['current_room'], 1);
    });

    test('failure on the read step → NetworkError', () async {
      final q = _SupabaseQueue()..enqueue(404, _pgError);

      final result = await _ds(q).advanceRoom('run-1');

      expect(result.error, isA<NetworkError>());
      expect(q.requests, hasLength(1)); // never reached the update
    });
  });

  group('finishRun', () {
    for (final (status, expected) in [
      (RunStatus.completed, 'completed'),
      (RunStatus.failed, 'failed'),
      (RunStatus.abandoned, 'abandoned'),
      // inProgress isn't a terminal state — datasource coerces it.
      (RunStatus.inProgress, 'abandoned'),
    ]) {
      test('$status is written as "$expected" with an ended_at', () async {
        final q = _SupabaseQueue()
          ..enqueue(
            200,
            _runRow(status: expected, endedAt: '2026-06-01T11:00:00Z'),
          );

        final result = await _ds(q).finishRun('run-1', status);

        expect(result.error, isNull);
        final body =
            jsonDecode(q.requests.single.body) as Map<String, dynamic>;
        expect(body['run_status'], expected);
        expect(body['ended_at'], isNotNull);
      });
    }

    test('update failure → NetworkError', () async {
      final q = _SupabaseQueue()..enqueue(500, _pgError);

      final result = await _ds(q).finishRun('run-1', RunStatus.completed);

      expect(result.error, isA<NetworkError>());
    });
  });
}
