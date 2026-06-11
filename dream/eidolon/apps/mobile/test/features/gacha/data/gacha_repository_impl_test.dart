import 'dart:convert';

import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/gacha/data/repositories/gacha_repository_impl.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_item.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_pull_result.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
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
          _queue.isNotEmpty ? _queue.removeAt(0) : (200, 'null');
      // postgrest dereferences response.request!, so always attach it.
      return http.Response(
        body,
        status,
        request: request,
        headers: {'content-type': 'application/json'},
      );
    });
    return SupabaseClient(
      'http://localhost:54321',
      'test-key',
      httpClient: mock,
    );
  }
}

GachaRepositoryImpl _repo(_SupabaseQueue q) =>
    GachaRepositoryImpl(q.buildClient());

const _pgError = {'message': 'oops', 'code': '500'};

// ── Tests ─────────────────────────────────────────────────────────────────────

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('getCrystalBundles', () {
    test(
        'falls back to the static bundle list when the store SDK is '
        'unavailable (as in tests)', () async {
      final result = await _repo(_SupabaseQueue()).getCrystalBundles();

      expect(result.error, isNull);
      final bundles = result.value!;
      expect(bundles, hasLength(4));
      // Sorted ascending by crystals; only the mega pack is best value.
      expect(bundles.map((b) => b.crystals), [80, 500, 1800, 5000]);
      expect(bundles.where((b) => b.isBestValue).single.crystals, 5000);
      expect(bundles.first.displayPrice, isNotEmpty);
    });
  });

  group('pull', () {
    test('single pull deducts 100 and records one result', () async {
      final q = _SupabaseQueue()
        ..enqueue(200, 'null') // rpc deduct_crystals
        ..enqueue(201, const []); // insert gacha_pulls

      final result = await _repo(q).pull(userId: 'u1', count: 1);

      expect(result.error, isNull);
      final pull = result.value!;
      expect(pull.crystalsSpent, kSinglePullCost);
      expect(pull.items, hasLength(1));
      // Rolled item must come from the canonical catalog.
      expect(kGachaCatalog.map((i) => i.id), contains(pull.items.single.id));

      expect(q.requests, hasLength(2));
      final rpcReq = q.requests[0];
      expect(rpcReq.url.path, endsWith('/rpc/deduct_crystals'));
      final rpcBody = jsonDecode(rpcReq.body) as Map<String, dynamic>;
      expect(rpcBody['p_user_id'], 'u1');
      expect(rpcBody['p_amount'], 100);

      final insertReq = q.requests[1];
      expect(insertReq.url.path, endsWith('/gacha_pulls'));
      final insertBody = jsonDecode(insertReq.body) as Map<String, dynamic>;
      expect(insertBody['count'], 1);
      expect(insertBody['currency_spent'], 100);
      final results = insertBody['results'] as List<dynamic>;
      expect(results, hasLength(1));
      expect((results.first as Map)['item_id'], pull.items.single.id);
      expect((results.first as Map)['rarity'], pull.items.single.rarity.name);
    });

    test('ten pull costs 900 and rolls ten catalog items', () async {
      final q = _SupabaseQueue()
        ..enqueue(200, 'null')
        ..enqueue(201, const []);

      final result = await _repo(q).pull(userId: 'u1', count: 10);

      expect(result.error, isNull);
      expect(result.value!.crystalsSpent, kTenPullCost);
      expect(result.value!.items, hasLength(10));
      final catalogIds = kGachaCatalog.map((i) => i.id).toSet();
      for (final item in result.value!.items) {
        expect(catalogIds, contains(item.id));
      }
    });

    test('insufficient crystals (P0001) → friendly 422', () async {
      final q = _SupabaseQueue()
        ..enqueue(400, {'message': 'insufficient crystals', 'code': 'P0001'});

      final result = await _repo(q).pull(userId: 'u1', count: 1);

      expect(result.error, isA<NetworkError>());
      final e = result.error! as NetworkError;
      expect(e.message, 'Not enough Soul Crystals.');
      expect(e.statusCode, 422);
      expect(q.requests, hasLength(1)); // roll/insert never happened
    });

    test('other Postgrest failure → NetworkError with parsed code', () async {
      final q = _SupabaseQueue()..enqueue(500, _pgError);

      final result = await _repo(q).pull(userId: 'u1', count: 1);

      final e = result.error! as NetworkError;
      expect(e.message, 'oops');
      expect(e.statusCode, 500);
    });
  });

  group('getCrystals', () {
    test('returns the balance', () async {
      final q = _SupabaseQueue()..enqueue(200, {'soul_crystals': 420});

      final result = await _repo(q).getCrystals('u1');

      expect(result.error, isNull);
      expect(result.value, 420);
      expect(q.requests.single.url.queryParameters['id'], 'eq.u1');
    });

    test('null balance is treated as zero', () async {
      final q = _SupabaseQueue()..enqueue(200, {'soul_crystals': null});

      final result = await _repo(q).getCrystals('u1');

      expect(result.value, 0);
    });

    test('failure → NetworkError', () async {
      final q = _SupabaseQueue()..enqueue(500, _pgError);

      final result = await _repo(q).getCrystals('u1');

      expect(result.error, isA<NetworkError>());
    });
  });

  group('getPullHistory', () {
    test('resolves item ids through the catalog, skipping unknowns', () async {
      final q = _SupabaseQueue()
        ..enqueue(200, [
          {
            'results': [
              {'item_id': 'leg_001', 'rarity': 'legendary'},
              {'item_id': 'ghost_item', 'rarity': 'common'}, // not in catalog
            ],
          },
          {'results': 'corrupted'}, // non-list results row is ignored
          {
            'results': [
              {'item_id': 'epc_001', 'rarity': 'epic'},
            ],
          },
        ]);

      final result = await _repo(q).getPullHistory('u1');

      expect(result.error, isNull);
      expect(result.value!.map((i) => i.id), ['leg_001', 'epc_001']);

      final params = q.requests.single.url.queryParameters;
      expect(params['user_id'], 'eq.u1');
      expect(params['limit'], '10');
      expect(params['order'], contains('pulled_at'));
    });

    test('caps the flattened history at 30 items', () async {
      final tenLegendaries = List.generate(
        10,
        (_) => {'item_id': 'leg_001', 'rarity': 'legendary'},
      );
      final q = _SupabaseQueue()
        ..enqueue(
          200,
          List.generate(4, (_) => {'results': tenLegendaries}),
        );

      final result = await _repo(q).getPullHistory('u1');

      expect(result.value, hasLength(30));
    });

    test('failure → NetworkError', () async {
      final q = _SupabaseQueue()..enqueue(500, _pgError);

      final result = await _repo(q).getPullHistory('u1');

      expect(result.error, isA<NetworkError>());
    });
  });
}
