import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/eidolon/domain/entities/chat_message.dart';
import 'package:shared_types/shared_types.dart';

abstract interface class EidolonRepository {
  Future<Result<EidolonProfile>> getEidolonForCurrentUser();
  Future<Result<List<MemoryEntry>>> getRecentMemories({
    required String eidolonId,
    int limit = 20,
  });

  /// The persisted conversation (oldest→newest) for this Eidolon.
  Future<Result<List<ChatMessage>>> getChatHistory({
    required String eidolonId,
    int limit = 50,
  });
}
