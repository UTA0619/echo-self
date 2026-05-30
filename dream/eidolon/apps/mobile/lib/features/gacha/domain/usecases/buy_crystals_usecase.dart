import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/gacha/data/repositories/gacha_repository_impl.dart';
import 'package:eidolon/features/gacha/domain/repositories/gacha_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'buy_crystals_usecase.g.dart';

@riverpod
GetCrystalBundlesUseCase getCrystalBundlesUseCase(Ref ref) =>
    GetCrystalBundlesUseCase(ref.watch(gachaRepositoryProvider));

@riverpod
BuyCrystalsUseCase buyCrystalsUseCase(Ref ref) =>
    BuyCrystalsUseCase(ref.watch(gachaRepositoryProvider));

class GetCrystalBundlesUseCase {
  const GetCrystalBundlesUseCase(this._repo);
  final GachaRepository _repo;

  Future<Result<List<CrystalBundle>>> call() => _repo.getCrystalBundles();
}

class BuyCrystalsUseCase {
  const BuyCrystalsUseCase(this._repo);
  final GachaRepository _repo;

  Future<Result<int>> call({
    required String userId,
    required String productId,
  }) =>
      _repo.purchaseCrystals(userId: userId, productId: productId);
}
