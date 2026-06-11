import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:supabase_flutter/supabase_flutter.dart'
    hide AuthUser, OAuthProvider, User;

/// Shared MockClient-backed Supabase test double: drives the real Postgrest
/// builder chain against queued HTTP responses.
class SupabaseQueue {
  final List<http.Request> requests = [];
  final List<(int, String)> _queue = [];

  void enqueue(int status, Object body) =>
      _queue.add((status, body is String ? body : jsonEncode(body)));

  SupabaseClient buildClient() {
    final mock = MockClient((request) async {
      requests.add(request);
      final (status, body) =
          _queue.isNotEmpty ? _queue.removeAt(0) : (200, '[]');
      // postgrest dereferences response.request!, so always attach it.
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

const pgError = {'message': 'oops', 'code': '500'};
