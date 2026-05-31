import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/gacha/data/repositories/gacha_repository_impl.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_item.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_pull_result.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

// ── Fake Supabase infrastructure ──────────────────────────────────────────────

/// Fake SupabaseClient that can simulate success or PostgrestException per table.
class _FakeSupabase extends Fake implements SupabaseClient {
  _FakeSupabase({
    this.rpcThrows,
    this.insertThrows,
    this.selectRows,
    this.singleRow,
  });

  /// If set, `rpc()` throws this exception.
  final PostgrestException? rpcThrows;

  /// If set, `insert()` throws this exception.
  final PostgrestException? insertThrows;

  /// Rows returned by `select()` (non-single).
  final List<Map<String, dynamic>>? selectRows;

  /// Row returned by `.single()`.
  final Map<String, dynamic>? singleRow;

  @override
  SupabaseQueryBuilder from(String table) =>
      _FakeQuery(this, table: table);

  @override
  PostgrestFilterBuilder<T> rpc<T>(
    String fn, {
    Map<String, dynamic>? params,
    FetchOptions? options,
  }) {
    if (rpcThrows != null) throw rpcThrows!;
    return _FakeFilterBuilder<T>() as PostgrestFilterBuilder<T>;
  }
}

class _FakeQuery extends Fake implements SupabaseQueryBuilder {
  _FakeQuery(this._supabase, {required this.table});
  final _FakeSupabase _supabase;
  final String table;

  @override
  PostgrestFilterBuilder<List<Map<String, dynamic>>> select([
    String columns = '*',
  ]) =>
      _FakeFilterBuilder<List<Map<String, dynamic>>>(
        rows: _supabase.selectRows,
        singleRow: _supabase.singleRow,
      );

  @override
  PostgrestFilterBuilder<Map<String, dynamic>> insert(
    Object values, {
    bool defaultToNull = true,
  }) {
    if (_supabase.insertThrows != null) throw _supabase.insertThrows!;
    return _FakeFilterBuilder<Map<String, dynamic>>();
  }

  @override
  Future<void> upsert(dynamic values, {String? onConflict}) async {}
}

class _FakeFilterBuilder<T> extends Fake
    implements PostgrestFilterBuilder<T> {
  _FakeFilterBuilder({this.rows, this.singleRow});
  final List<Map<String, dynamic>>? rows;
  final Map<String, dynamic>? singleRow;

  @override
  _FakeFilterBuilder<T> eq(String column, dynamic value) => this;

  @override
  _FakeFilterBuilder<T> order(String column, {bool ascending = true}) => this;

  @override
  _FakeFilterBuilder<T> limit(int count, {String? referencedTable}) => this;

  @override
  Future<Map<String, dynamic>> single() async =>
      singleRow ?? <String, dynamic>{};

  @override
  dynamic noSuchMethod(Invocation inv) => this;

  @override
  Future<T> then<R>(
    Function(T) onValue, {
    Function? onError,
  }) async {
    final result = (rows ?? <Map<String, dynamic>>[]) as T;
    return onValue(result) as T;
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

void main() {
  group('GachaRepositoryImpl.pull', () {
    test('returns ok with correct crystalsSpent for single pull', () async {
      final supabase = _FakeSupabase(
        selectRows: [],
        singleRow: {'soul_crystals': 500},
      );
      final repo = GachaRepositoryImpl(supabase);

      final result = await repo.pull(userId: 'uid-1', count: 1);

      expect(result.isSuccess, isTrue);
      expect(result.value!.crystalsSpent, kSinglePullCost);
      expect(result.value!.items.length, 1);
    });

    test('returns ok with correct crystalsSpent for ten pull', () async {
      final supabase = _FakeSupabase(selectRows: []);
      final repo = GachaRepositoryImpl(supabase);

      final result = await repo.pull(userId: 'uid-1', count: 10);

      expect(result.isSuccess, isTrue);
      expect(result.value!.crystalsSpent, kTenPullCost);
      expect(result.value!.items.length, 10);
    });

    test('returns network error with 422 on insufficient crystals', () async {
      final supabase = _FakeSupabase(
        rpcThrows: PostgrestException(message: 'insufficient crystals'),
      );
      final repo = GachaRepositoryImpl(supabase);

      final result = await repo.pull(userId: 'uid-1', count: 1);

      expect(result.isFailure, isTrue);
      final error = result.error as NetworkError;
      expect(error.statusCode, 422);
    });
  });

  group('GachaRepositoryImpl.getPullHistory', () {
    test('returns empty list when no rows', () async {
      final supabase = _FakeSupabase(selectRows: []);
      final repo = GachaRepositoryImpl(supabase);

      final result = await repo.getPullHistory('uid-1');

      expect(result.isSuccess, isTrue);
      expect(result.value, isEmpty);
    });

    test('maps item_id results to GachaItem entities', () async {
      final firstItem = kGachaCatalog.first;
      final supabase = _FakeSupabase(
        selectRows: [
          {
            'results': [
              {'item_id': firstItem.id, 'rarity': firstItem.rarity.name}
            ]
          }
        ],
      );
      final repo = GachaRepositoryImpl(supabase);

      final result = await repo.getPullHistory('uid-1');

      expect(result.isSuccess, isTrue);
      expect(result.value!.first.id, firstItem.id);
    });
  });

  group('GachaRepositoryImpl.getCrystals', () {
    test('returns crystal count from row', () async {
      final supabase = _FakeSupabase(
        singleRow: {'soul_crystals': 350},
      );
      final repo = GachaRepositoryImpl(supabase);

      final result = await repo.getCrystals('uid-1');

      expect(result.isSuccess, isTrue);
      expect(result.value, 350);
    });

    test('returns 0 when soul_crystals is null', () async {
      final supabase = _FakeSupabase(
        singleRow: {'soul_crystals': null},
      );
      final repo = GachaRepositoryImpl(supabase);

      final result = await repo.getCrystals('uid-1');

      expect(result.isSuccess, isTrue);
      expect(result.value, 0);
    });
  });
}
