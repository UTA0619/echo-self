import 'dart:math';

import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/core/supabase/supabase_service.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_item.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_pull_result.dart';
import 'package:eidolon/features/gacha/domain/repositories/gacha_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

part 'gacha_repository_impl.g.dart';

@Riverpod(keepAlive: true)
GachaRepository gachaRepository(Ref ref) =>
    GachaRepositoryImpl(ref.watch(supabaseClientProvider));

class GachaRepositoryImpl implements GachaRepository {
  GachaRepositoryImpl(this._supabase);
  final SupabaseClient _supabase;

  static final _rng = Random.secure();

  // ── Public API ────────────────────────────────────────────────────────────

  @override
  Future<Result<GachaPullResult>> pull({
    required String userId,
    required int count,
  }) async {
    assert(count == 1 || count == 10, 'count must be 1 or 10');
    final cost = count == 1 ? kSinglePullCost : kTenPullCost;

    try {
      // 1. Deduct crystals atomically via RPC
      await _supabase.rpc<void>(
        'deduct_crystals',
        params: {'p_user_id': userId, 'p_amount': cost},
      );

      // 2. Roll items locally using catalog + weighted random
      final items = List.generate(count, (_) => _roll());

      // 3. Persist pull records
      final now = DateTime.now();
      await _supabase.from('gacha_pulls').insert(
            items
                .map(
                  (item) => {
                    'user_id': userId,
                    'item_id': item.id,
                    'rarity': item.rarity.name,
                    'pulled_at': now.toIso8601String(),
                  },
                )
                .toList(),
          );

      return ok(
        GachaPullResult(
          items: items,
          pulledAt: now,
          crystalsSpent: cost,
        ),
      );
    } on PostgrestException catch (e) {
      // RPC throws with code P0001 when insufficient crystals
      if (e.message.contains('insufficient') || e.code == 'P0001') {
        return err(
          const AppError.network(
            message: 'Not enough Soul Crystals.',
            statusCode: 422,
          ),
        );
      }
      return err(
        AppError.network(
          message: e.message,
          statusCode: int.tryParse(e.code ?? ''),
        ),
      );
    } catch (e, st) {
      return err(AppError.unknown(error: e, stackTrace: st));
    }
  }

  @override
  Future<Result<int>> getCrystals(String userId) async {
    try {
      final row = await _supabase
          .from('users')
          .select('soul_crystals')
          .eq('id', userId)
          .single();
      return ok((row['soul_crystals'] as int?) ?? 0);
    } on PostgrestException catch (e) {
      return err(
        AppError.network(
          message: e.message,
          statusCode: int.tryParse(e.code ?? ''),
        ),
      );
    } catch (e, st) {
      return err(AppError.unknown(error: e, stackTrace: st));
    }
  }

  @override
  Future<Result<List<GachaItem>>> getPullHistory(String userId) async {
    try {
      final rows = await _supabase
          .from('gacha_pulls')
          .select('item_id')
          .eq('user_id', userId)
          .order('pulled_at', ascending: false)
          .limit(30);

      final items = (rows as List<dynamic>)
          .map((r) => (r as Map<String, dynamic>)['item_id'] as String)
          .map((id) => kGachaCatalog.where((i) => i.id == id).firstOrNull)
          .whereType<GachaItem>()
          .toList();

      return ok(items);
    } on PostgrestException catch (e) {
      return err(
        AppError.network(
          message: e.message,
          statusCode: int.tryParse(e.code ?? ''),
        ),
      );
    } catch (e, st) {
      return err(AppError.unknown(error: e, stackTrace: st));
    }
  }

  // ── Weighted random roll ──────────────────────────────────────────────────

  GachaItem _roll() {
    final rarity = _rollRarity();
    final pool = kGachaCatalog.where((i) => i.rarity == rarity).toList();
    return pool[_rng.nextInt(pool.length)];
  }

  GachaRarity _rollRarity() {
    final roll = _rng.nextInt(10000);
    int cumulative = 0;
    for (final rarity in GachaRarity.values.reversed) {
      cumulative += rarity.weight;
      if (roll < cumulative) return rarity;
    }
    return GachaRarity.common;
  }
}
