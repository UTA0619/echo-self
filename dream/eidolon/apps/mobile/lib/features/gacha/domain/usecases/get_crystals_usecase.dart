import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/gacha/data/repositories/gacha_repository_impl.dart';
import 'package:eidolon/features/gacha/domain/repositories/gacha_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'get_crystals_usecase.g.dart';

@riverpod
GetCrystalsUseCase getCrystalsUseCase(Ref ref) =>
    GetCrystalsUseCase(ref.watch(gachaRepositoryProvider));

class GetCrystalsUseCase {
  const GetCrystalsUseCase(this._repo);
  final GachaRepository _repo;

  Future<Result<int>> call(String userId) => _repo.getCrystals(userId);
}
