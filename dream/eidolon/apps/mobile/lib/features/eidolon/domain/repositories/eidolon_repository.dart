import 'package:eidolon/core/error/app_error.dart';
import 'package:shared_types/shared_types.dart';

abstract interface class EidolonRepository {
  Future<Result<EidolonProfile>> getEidolonForCurrentUser();
  Future<Result<List<MemoryEntry>>> getRecentMemories({
    required String eidolonId,
    int limit = 20,
  });
}
