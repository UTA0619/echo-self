import 'dart:convert';

import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/onboarding/domain/entities/big_five_question.dart';
import 'package:eidolon/features/onboarding/domain/entities/onboarding_state.dart';
import 'package:eidolon/features/onboarding/domain/usecases/complete_onboarding_usecase.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:supabase_flutter/supabase_flutter.dart'
    hide AuthUser, OAuthProvider, User;

class _SupabaseQueue {
  final List<http.Request> requests = [];
  final List<(int, String)> _queue = [];

  void enqueue(int status, Object body) =>
      _queue.add((status, body is String ? body : jsonEncode(body)));

  SupabaseClient buildClient() {
    final mock = MockClient((request) async {
      requests.add(request);
      final (status, body) =
          _queue.isNotEmpty ? _queue.removeAt(0) : (200, '[]');
      return http.Response(
        body,
        status,
        request: request,
        headers: {'content-type': 'application/json'},
      );
    });
    return SupabaseClient(
      'http://localhost:54321',
      'test-key',
      httpClient: mock,
    );
  }
}

OnboardingState _state() => OnboardingState(
      username: '  shadow_walker  ',
      eidolonName: '  Nyx  ',
      answers: {for (final q in kPersonalityQuestions) q.id: 5},
    );

void main() {
  group('CompleteOnboardingUseCase', () {
    test('updates username, looks up the game id, then inserts the eidolon',
        () async {
      final q = _SupabaseQueue()
        ..enqueue(200, const []) // 1: update users.username
        ..enqueue(200, {'id': 'game-1'}) // 2: select users.id
        ..enqueue(201, const []); // 3: insert eidolons

      final usecase = CompleteOnboardingUseCase(q.buildClient());
      final result = await usecase.call(_state(), authUid: 'auth-1');

      expect(result.error, isNull);
      expect(q.requests, hasLength(3));

      final update = q.requests[0];
      expect(update.method, 'PATCH');
      expect(update.url.path, endsWith('/users'));
      expect(update.url.queryParameters['auth_uid'], 'eq.auth-1');
      expect(
        (jsonDecode(update.body) as Map<String, dynamic>)['username'],
        'shadow_walker',
      );

      final select = q.requests[1];
      expect(select.method, 'GET');
      expect(select.url.queryParameters['auth_uid'], 'eq.auth-1');

      final insert = q.requests[2];
      expect(insert.method, 'POST');
      expect(insert.url.path, endsWith('/eidolons'));
      final body = jsonDecode(insert.body) as Map<String, dynamic>;
      expect(body['user_id'], 'game-1');
      expect(body['name'], 'Nyx');
      for (final col in [
        'openness',
        'conscientiousness',
        'extraversion',
        'agreeableness',
        'neuroticism',
      ]) {
        expect(body[col], isA<int>(), reason: '\$col should be persisted');
      }
    });

    test('a failure surfaces as NetworkError and skips the remaining steps',
        () async {
      final q = _SupabaseQueue()
        ..enqueue(403, {'message': 'rls denied', 'code': '42501'});

      final usecase = CompleteOnboardingUseCase(q.buildClient());
      final result = await usecase.call(_state(), authUid: 'auth-1');

      expect(result.error, isA<NetworkError>());
      expect((result.error! as NetworkError).message, 'rls denied');
      expect(q.requests, hasLength(1));
    });
  });
}
