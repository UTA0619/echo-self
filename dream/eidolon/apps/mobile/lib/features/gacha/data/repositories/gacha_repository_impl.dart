import 'dart:math';

import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/core/supabase/supabase_service.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_item.dart';
import 'package:eidolon/features/gacha/data/repositories/gacha_iap_products.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_pull_result.dart';
import 'package:eidolon/features/gacha/domain/repositories/gacha_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
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

  // ── Crystal bundles ───────────────────────────────────────────────────────

  @override
  Future<Result<List<CrystalBundle>>> getCrystalBundles() async {
    try {
      final offerings = await Purchases.getOfferings();
      final offering =
          offerings.getOffering(kGachaOffering) ?? offerings.current;

      if (offering == null) return ok(fallbackCrystalBundles());

      final bundles = offering.availablePackages.map((pkg) {
        final crystals = crystalsForProduct(pkg.storeProduct.identifier);
        return CrystalBundle(
          productId: pkg.storeProduct.identifier,
          crystals: crystals,
          displayPrice: pkg.storeProduct.priceString,
          isBestValue: pkg.packageType == PackageType.annual ||
              pkg.storeProduct.identifier == kGachaProductMega,
        );
      }).toList()
        ..sort((a, b) => a.crystals.compareTo(b.crystals));

      return ok(bundles.isEmpty ? fallbackCrystalBundles() : bundles);
    } catch (_) {
      // Don't fail hard — return static fallback so UI still shows bundles
      return ok(fallbackCrystalBundles());
    }
  }

  @override
  Future<Result<int>> purchaseCrystals({
    required String userId,
    required String productId,
  }) async {
    try {
      final offerings = await Purchases.getOfferings();
      final offering =
          offerings.getOffering(kGachaOffering) ?? offerings.current;
      if (offering == null) {
        return err(
          const AppError.network(
            message: 'Store not available. Please try again later.',
            statusCode: 503,
          ),
        );
      }

      final matchedPackage = offering.availablePackages
          .where((p) => p.storeProduct.identifier == productId)
          .firstOrNull;
      if (matchedPackage == null) {
        return err(
          AppError.network(
            message: 'Product not found: $productId',
            statusCode: 404,
          ),
        );
      }
      final pkg = matchedPackage;

      // Trigger native purchase sheet
      final purchaseResult = await Purchases.purchase(
        PurchaseParams.package(pkg),
      );
      final customerInfo = purchaseResult.customerInfo;

      // Count crystals to credit
      final crystals = crystalsForProduct(productId);

      // Credit via Supabase RPC (idempotent — receipt_id prevents double-credit)
      await _supabase.rpc<void>(
        'credit_crystals',
        params: {
          'p_user_id': userId,
          'p_amount': crystals,
          'p_receipt_id': customerInfo.originalAppUserId,
        },
      );

      // Return new balance
      final balanceResult = await getCrystals(userId);
      return balanceResult;
    } on PurchasesErrorCode catch (e) {
      // User cancelled — not an error worth reporting
      if (e == PurchasesErrorCode.purchaseCancelledError) {
        return err(
          const AppError.network(
            message: 'Purchase cancelled.',
            statusCode: 0,
          ),
        );
      }
      return err(AppError.network(message: e.toString()));
    } catch (e, st) {
      return err(AppError.unknown(error: e, stackTrace: st));
    }
  }

  // ── Pull logic ────────────────────────────────────────────────────────────

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

      // 3. Persist pull record (one row per pull, results as JSONB array)
      final now = DateTime.now();
      await _supabase.from('gacha_pulls').insert({
        'user_id': userId,
        'pool_id': 'standard',
        'count': count,
        'results': items
            .map((item) => {'item_id': item.id, 'rarity': item.rarity.name})
            .toList(),
        'currency_spent': cost,
        'pity_before': 0,
        'pity_after': 0,
        'pulled_at': now.toIso8601String(),
      });

      return ok(
        GachaPullResult(
          items: items,
          pulledAt: now,
          crystalsSpent: cost,
        ),
      );
    } on PostgrestException catch (e) {
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
          .select('results')
          .eq('user_id', userId)
          .order('pulled_at', ascending: false)
          .limit(10); // 10 pulls × up to 10 items = 100 items max

      final items = (rows as List<dynamic>)
          .expand((r) {
            final results = (r as Map<String, dynamic>)['results'];
            if (results is! List<dynamic>) return <GachaItem>[];
            return results
                .map(
                  (entry) =>
                      (entry as Map<String, dynamic>)['item_id'] as String,
                )
                .map(
                  (id) => kGachaCatalog.where((i) => i.id == id).firstOrNull,
                )
                .whereType<GachaItem>();
          })
          .take(30)
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

  // ── Helpers ───────────────────────────────────────────────────────────────

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
