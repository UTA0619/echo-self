import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/home/data/repositories/home_repository_impl.dart';
import 'package:eidolon/features/home/domain/repositories/home_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_types/shared_types.dart';

part 'get_player_profile_usecase.g.dart';

@riverpod
GetPlayerProfileUseCase getPlayerProfileUseCase(Ref ref) =>
    GetPlayerProfileUseCase(ref.watch(homeRepositoryProvider));

class GetPlayerProfileUseCase {
  const GetPlayerProfileUseCase(this._repo);
  final HomeRepository _repo;

  Future<Result<PlayerProfile>> call(String authUid) =>
      _repo.getPlayerProfile(authUid);
}
