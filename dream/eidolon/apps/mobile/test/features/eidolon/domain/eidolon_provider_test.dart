import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/eidolon/domain/entities/chat_message.dart';
import 'package:eidolon/features/eidolon/domain/repositories/eidolon_repository.dart';
import 'package:eidolon/features/eidolon/domain/repositories/eidolon_respond_repository.dart';
import 'package:eidolon/features/eidolon/domain/usecases/get_chat_history_usecase.dart';
import 'package:eidolon/features/eidolon/domain/usecases/get_eidolon_usecase.dart';
import 'package:eidolon/features/eidolon/domain/usecases/send_message_usecase.dart';
import 'package:eidolon/features/eidolon/presentation/providers/eidolon_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_types/shared_types.dart';

// ── Fake implementations ──────────────────────────────────────────────────────

class _FakeEidolonRepo implements EidolonRepository {
  _FakeEidolonRepo({required this.result, this.history});
  final Result<EidolonProfile> result;
  final Result<List<ChatMessage>>? history;

  @override
  Future<Result<EidolonProfile>> getEidolonForCurrentUser() async => result;

  @override
  Future<Result<List<MemoryEntry>>> getRecentMemories({
    required String eidolonId,
    int limit = 20,
  }) async =>
      ok([]);

  @override
  Future<Result<List<ChatMessage>>> getChatHistory({
    required String eidolonId,
    int limit = 50,
  }) async =>
      history ?? ok(<ChatMessage>[]);
}

class _FakeRespondRepo implements EidolonRespondRepository {
  _FakeRespondRepo({required this.result});
  final Result<EidolonResponse> result;

  @override
  Future<Result<EidolonResponse>> sendMessage({
    required String eidolonId,
    required String message,
    String? questContext,
  }) async =>
      result;
}

EidolonProfile _makeEidolon() => EidolonProfile(
      id: 'eid-1',
      userId: 'user-1',
      name: 'Aether',
      personality: const PersonalityProfile(),
      createdAt: DateTime(2025),
      updatedAt: DateTime(2025),
    );

// ── Helpers ───────────────────────────────────────────────────────────────────

ProviderContainer _makeContainer({
  Result<EidolonProfile>? eidolonResult,
  Result<EidolonResponse>? respondResult,
  Result<List<ChatMessage>>? historyResult,
}) {
  final eidolon = _makeEidolon();
  return ProviderContainer(
    overrides: [
      getEidolonUseCaseProvider.overrideWith(
        (ref) => GetEidolonUseCase(
          _FakeEidolonRepo(result: eidolonResult ?? ok(eidolon)),
        ),
      ),
      getChatHistoryUseCaseProvider.overrideWith(
        (ref) => GetChatHistoryUseCase(
          _FakeEidolonRepo(
            result: eidolonResult ?? ok(eidolon),
            history: historyResult,
          ),
        ),
      ),
      sendMessageUseCaseProvider.overrideWith(
        (ref) => SendMessageUseCase(
          _FakeRespondRepo(
            result: respondResult ??
                ok(
                  const EidolonResponse(
                    text: 'Hello, adventurer.',
                    newMemoryId: 'mem-1',
                    modelUsed: 'claude-haiku-4-5',
                    latencyMs: 100,
                  ),
                ),
          ),
        ),
      ),
    ],
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

void main() {
  group('EidolonNotifier', () {
    test('initial state is empty', () {
      final container = _makeContainer();
      addTearDown(container.dispose);
      final state = container.read(eidolonNotifierProvider);
      expect(state.eidolon, isNull);
      expect(state.messages, isEmpty);
      expect(state.isLoading, false);
      expect(state.isSending, false);
      expect(state.errorMessage, isNull);
    });

    test('loadEidolon sets eidolon on success', () async {
      final container = _makeContainer();
      addTearDown(container.dispose);

      await container.read(eidolonNotifierProvider.notifier).loadEidolon();

      final state = container.read(eidolonNotifierProvider);
      expect(state.isLoading, false);
      expect(state.eidolon?.name, 'Aether');
      expect(state.errorMessage, isNull);
    });

    test('loadEidolon restores the persisted conversation', () async {
      final container = _makeContainer(
        historyResult: ok([
          ChatMessage(
            id: 'm-1',
            text: 'Welcome back.',
            isFromEidolon: true,
            timestamp: DateTime(2026),
          ),
        ]),
      );
      addTearDown(container.dispose);

      await container.read(eidolonNotifierProvider.notifier).loadEidolon();

      final state = container.read(eidolonNotifierProvider);
      expect(state.messages, hasLength(1));
      expect(state.messages.first.text, 'Welcome back.');
      expect(state.messages.first.isFromEidolon, isTrue);
    });

    test('loadEidolon sets errorMessage on failure', () async {
      final container = _makeContainer(
        eidolonResult: err(const AppError.auth(message: 'Not authenticated')),
      );
      addTearDown(container.dispose);

      await container.read(eidolonNotifierProvider.notifier).loadEidolon();

      final state = container.read(eidolonNotifierProvider);
      expect(state.isLoading, false);
      expect(state.eidolon, isNull);
      expect(state.errorMessage, 'Not authenticated');
    });

    test('sendMessage appends user and eidolon messages on success', () async {
      final container = _makeContainer();
      addTearDown(container.dispose);

      // Load eidolon first
      await container.read(eidolonNotifierProvider.notifier).loadEidolon();
      await container
          .read(eidolonNotifierProvider.notifier)
          .sendMessage('Hello!');

      final state = container.read(eidolonNotifierProvider);
      expect(state.messages.length, 2);
      expect(state.messages[0].text, 'Hello!');
      expect(state.messages[0].isFromEidolon, false);
      expect(state.messages[1].text, 'Hello, adventurer.');
      expect(state.messages[1].isFromEidolon, true);
      expect(state.isSending, false);
    });

    test('sendMessage sets errorMessage on failure', () async {
      final container = _makeContainer(
        respondResult: err(const AppError.network(message: 'Timeout')),
      );
      addTearDown(container.dispose);

      await container.read(eidolonNotifierProvider.notifier).loadEidolon();
      await container
          .read(eidolonNotifierProvider.notifier)
          .sendMessage('Test');

      final state = container.read(eidolonNotifierProvider);
      expect(state.errorMessage, isNotNull);
      expect(state.isSending, false);
      // User message was still added optimistically
      expect(state.messages.first.isFromEidolon, false);
    });

    test('clearError removes errorMessage', () async {
      final container = _makeContainer(
        eidolonResult: err(const AppError.auth(message: 'Fail')),
      );
      addTearDown(container.dispose);

      await container.read(eidolonNotifierProvider.notifier).loadEidolon();
      container.read(eidolonNotifierProvider.notifier).clearError();

      expect(
        container.read(eidolonNotifierProvider).errorMessage,
        isNull,
      );
    });
  });

  group('ChatMessage', () {
    test('creates with correct fields', () {
      final msg = ChatMessage(
        id: 'id-1',
        text: 'Hello',
        isFromEidolon: true,
        timestamp: DateTime(2025),
        modelUsed: 'claude-haiku-4-5',
      );
      expect(msg.id, 'id-1');
      expect(msg.text, 'Hello');
      expect(msg.isFromEidolon, true);
      expect(msg.modelUsed, 'claude-haiku-4-5');
    });
  });
}
