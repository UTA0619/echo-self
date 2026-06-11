import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/eidolon/data/repositories/eidolon_repository_impl.dart';
import 'package:eidolon/features/eidolon/domain/repositories/eidolon_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_types/shared_types.dart';

part 'get_eidolon_usecase.g.dart';

@riverpod
GetEidolonUseCase getEidolonUseCase(Ref ref) =>
    GetEidolonUseCase(ref.watch(eidolonRepositoryProvider));

class GetEidolonUseCase {
  const GetEidolonUseCase(this._repo);
  final EidolonRepository _repo;

  Future<Result<EidolonProfile>> call() => _repo.getEidolonForCurrentUser();
}
