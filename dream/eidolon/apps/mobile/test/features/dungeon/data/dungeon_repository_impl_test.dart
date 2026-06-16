import 'package:eidolon/features/dungeon/data/datasources/dungeon_generate_datasource.dart';
import 'package:eidolon/features/dungeon/data/datasources/dungeon_supabase_datasource.dart';
import 'package:eidolon/features/dungeon/data/repositories/dungeon_repository_impl.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_types/shared_types.dart';

import '../../home/data/helpers/supabase_queue.dart';

// The repository is a thin pass-through; verify each method delegates to the
// right datasource by asserting on the HTTP the underlying builder chain emits.

DungeonRepositoryImpl _repo(SupabaseQueue q) {
  final client = q.buildClient();
  return DungeonRepositoryImpl(
    db: DungeonSupabaseDataSource(client),
    generate: DungeonGenerateDataSource(client),
  );
}

Map<String, dynamic> _runRow() => {
      'id': 'run-1',
      'eidolon_id': 'eid-1',
      'dungeon_id': 'dun-1',
      'current_room': 0,
      'status': 'in_progress',
      'atk_bonus': 0,
      'hp_modifier': 0,
      'started_at': '2026-06-01T10:00:00Z',
      'completed_at': null,
    };

void main() {
  test('getDungeon delegates to the dungeons table', () async {
    final q = SupabaseQueue()
      ..enqueue(200, {
        'id': 'dun-1',
        'theme': 'forest',
        'difficulty': 1,
        'name': 'Glade',
        'narrative_intro': '',
        'layout': const <dynamic>[],
        'boss_config': const <String, dynamic>{},
        'created_at': '2026-06-01T00:00:00Z',
        'expires_at': '2026-06-02T00:00:00Z',
      });

    final result = await _repo(q).getDungeon('dun-1');

    expect(result.value!.id, 'dun-1');
    expect(q.requests.single.url.path, endsWith('/dungeons'));
  });

  test('generateDungeon delegates to the dungeon-generate edge function',
      () async {
    final q = SupabaseQueue()..enqueue(200, {'dungeonId': 'dun-9'});

    final result = await _repo(q).generateDungeon(eidolonId: 'eid-1');

    expect(result.value!.dungeon.id, 'dun-9');
    expect(
      q.requests.single.url.path,
      endsWith('/functions/v1/dungeon-generate'),
    );
  });

  test('startRun delegates to the runs table', () async {
    final q = SupabaseQueue()..enqueue(201, _runRow());

    final result = await _repo(q).startRun(eidolonId: 'eid-1', dungeonId: 'd');

    expect(result.value!.id, 'run-1');
    expect(q.requests.single.url.path, endsWith('/runs'));
    expect(q.requests.single.method, 'POST');
  });

  test('getActiveRun delegates to a filtered runs query', () async {
    final q = SupabaseQueue()..enqueue(200, [_runRow()]);

    final result = await _repo(q).getActiveRun('eid-1');

    expect(result.value!.id, 'run-1');
    expect(
      q.requests.single.url.queryParameters['status'],
      'eq.in_progress',
    );
  });

  test('advanceRoom delegates (read then patch)', () async {
    final q = SupabaseQueue()
      ..enqueue(200, {'current_room': 1})
      ..enqueue(200, _runRow());

    await _repo(q).advanceRoom('run-1');

    expect(q.requests, hasLength(2));
    expect(q.requests[1].method, 'PATCH');
  });

  test('finishRun delegates with the terminal status', () async {
    final q = SupabaseQueue()..enqueue(200, _runRow());

    await _repo(q).finishRun('run-1', RunStatus.completed);

    expect(q.requests.single.method, 'PATCH');
  });
}
