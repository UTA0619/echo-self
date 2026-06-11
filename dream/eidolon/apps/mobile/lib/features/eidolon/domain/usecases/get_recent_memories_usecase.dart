import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/eidolon/data/repositories/eidolon_repository_impl.dart';
import 'package:eidolon/features/eidolon/domain/repositories/eidolon_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_types/shared_types.dart';

part 'get_recent_memories_usecase.g.dart';

@riverpod
GetRecentMemoriesUseCase getRecentMemoriesUseCase(Ref ref) =>
    GetRecentMemoriesUseCase(ref.watch(eidolonRepositoryProvider));

class GetRecentMemoriesUseCase {
  const GetRecentMemoriesUseCase(this._repo);
  final EidolonRepository _repo;

  Future<Result<List<MemoryEntry>>> call({
    required String eidolonId,
    int limit = 20,
  }) =>
      _repo.getRecentMemories(eidolonId: eidolonId, limit: limit);
}
