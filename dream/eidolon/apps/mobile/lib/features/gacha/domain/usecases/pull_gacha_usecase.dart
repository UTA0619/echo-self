import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/gacha/data/repositories/gacha_repository_impl.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_pull_result.dart';
import 'package:eidolon/features/gacha/domain/repositories/gacha_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'pull_gacha_usecase.g.dart';

@riverpod
PullGachaUseCase pullGachaUseCase(Ref ref) =>
    PullGachaUseCase(ref.watch(gachaRepositoryProvider));

class PullGachaUseCase {
  const PullGachaUseCase(this._repo);
  final GachaRepository _repo;

  Future<Result<GachaPullResult>> call({
    required String userId,
    required int count,
  }) =>
      _repo.pull(userId: userId, count: count);
}
