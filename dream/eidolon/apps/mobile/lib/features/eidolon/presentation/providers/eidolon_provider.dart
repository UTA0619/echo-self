import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/eidolon/domain/entities/chat_message.dart';
import 'package:eidolon/features/eidolon/domain/usecases/get_eidolon_usecase.dart';
import 'package:eidolon/features/eidolon/domain/usecases/send_message_usecase.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_types/shared_types.dart';
import 'package:uuid/uuid.dart';

part 'eidolon_provider.freezed.dart';
part 'eidolon_provider.g.dart';

@freezed
abstract class EidolonState with _$EidolonState {
  const factory EidolonState({
    EidolonProfile? eidolon,
    @Default([]) List<ChatMessage> messages,
    @Default(false) bool isLoading,
    @Default(false) bool isSending,
    String? errorMessage,
  }) = _EidolonState;
}

@riverpod
class EidolonNotifier extends _$EidolonNotifier {
  static const _uuid = Uuid();

  @override
  EidolonState build() => const EidolonState();

  Future<void> loadEidolon() async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    final useCase = ref.read(getEidolonUseCaseProvider);
    final Result<EidolonProfile> result = await useCase();

    if (result.isSuccess) {
      state = state.copyWith(isLoading: false, eidolon: result.value);
    } else {
      state = state.copyWith(
        isLoading: false,
        errorMessage: switch (result.error!) {
          NetworkError(:final message) => message,
          AuthError(:final message) => message,
          NotFoundError(:final resource) => '$resource not found',
          AiError(:final message) => message,
          StorageError(:final message) => message,
          UnknownError(:final error) => error.toString(),
          _ => result.error!.toString(),
        },
      );
    }
  }

  Future<void> sendMessage(String text) async {
    final eidolon = state.eidolon;
    if (eidolon == null || state.isSending) return;

    final userMsg = ChatMessage(
      id: _uuid.v4(),
      text: text,
      isFromEidolon: false,
      timestamp: DateTime.now(),
    );

    state = state.copyWith(
      messages: [...state.messages, userMsg],
      isSending: true,
      errorMessage: null,
    );

    final useCase = ref.read(sendMessageUseCaseProvider);
    final result = await useCase(eidolonId: eidolon.id, message: text);

    if (result.isSuccess) {
      final r = result.value!;
      final eidolonMsg = ChatMessage(
        id: _uuid.v4(),
        text: r.text,
        isFromEidolon: true,
        timestamp: DateTime.now(),
        modelUsed: r.modelUsed,
      );
      state = state.copyWith(
        messages: [...state.messages, eidolonMsg],
        isSending: false,
      );
    } else {
      state = state.copyWith(
        isSending: false,
        errorMessage: switch (result.error!) {
          NetworkError(:final message) => message,
          AuthError(:final message) => message,
          AiError(:final message) => message,
          _ => 'Failed to reach ${eidolon.name}',
        },
      );
    }
  }

  void clearError() => state = state.copyWith(errorMessage: null);
}
