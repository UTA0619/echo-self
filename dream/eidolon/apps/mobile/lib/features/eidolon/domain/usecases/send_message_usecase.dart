import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/eidolon/data/repositories/eidolon_respond_repository_impl.dart';
import 'package:eidolon/features/eidolon/domain/repositories/eidolon_respond_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'send_message_usecase.g.dart';

@riverpod
SendMessageUseCase sendMessageUseCase(Ref ref) =>
    SendMessageUseCase(ref.watch(eidolonRespondRepositoryProvider));

class SendMessageUseCase {
  const SendMessageUseCase(this._repo);
  final EidolonRespondRepository _repo;

  Future<Result<EidolonResponse>> call({
    required String eidolonId,
    required String message,
    String? questContext,
  }) =>
      _repo.sendMessage(
        eidolonId: eidolonId,
        message: message,
        questContext: questContext,
      );
}
