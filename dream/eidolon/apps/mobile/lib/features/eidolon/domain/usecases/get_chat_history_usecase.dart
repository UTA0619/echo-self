import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/eidolon/data/repositories/eidolon_repository_impl.dart';
import 'package:eidolon/features/eidolon/domain/entities/chat_message.dart';
import 'package:eidolon/features/eidolon/domain/repositories/eidolon_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'get_chat_history_usecase.g.dart';

@riverpod
GetChatHistoryUseCase getChatHistoryUseCase(Ref ref) =>
    GetChatHistoryUseCase(ref.watch(eidolonRepositoryProvider));

class GetChatHistoryUseCase {
  const GetChatHistoryUseCase(this._repo);
  final EidolonRepository _repo;

  Future<Result<List<ChatMessage>>> call({
    required String eidolonId,
    int limit = 50,
  }) =>
      _repo.getChatHistory(eidolonId: eidolonId, limit: limit);
}
