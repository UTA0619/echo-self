import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/gacha/data/repositories/gacha_repository_impl.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_item.dart';
import 'package:eidolon/features/gacha/domain/repositories/gacha_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'get_pull_history_usecase.g.dart';

@riverpod
GetPullHistoryUseCase getPullHistoryUseCase(Ref ref) =>
    GetPullHistoryUseCase(ref.watch(gachaRepositoryProvider));

class GetPullHistoryUseCase {
  const GetPullHistoryUseCase(this._repo);
  final GachaRepository _repo;

  Future<Result<List<GachaItem>>> call(String userId) =>
      _repo.getPullHistory(userId);
}
