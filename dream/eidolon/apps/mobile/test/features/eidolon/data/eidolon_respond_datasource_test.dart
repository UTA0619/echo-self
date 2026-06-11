import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/eidolon/data/datasources/eidolon_respond_datasource.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../home/data/helpers/supabase_queue.dart';

EidolonRespondDataSource _ds(SupabaseQueue q) =>
    EidolonRespondDataSource(q.buildClient());

void main() {
  group('sendMessage', () {
    test('maps a 200 edge-function payload into an EidolonResponse', () async {
      final q = SupabaseQueue()
        ..enqueue(200, {
          'response': 'The shadows whisper your name…',
          'newMemoryId': 'mem-9',
          'modelUsed': 'claude-haiku-4.5',
          'latencyMs': 412,
        });

      final result = await _ds(q).sendMessage(
        eidolonId: 'eid-1',
        message: 'Hello?',
        questContext: 'in the glade',
      );

      expect(result.error, isNull);
      final r = result.value!;
      expect(r.text, 'The shadows whisper your name…');
      expect(r.newMemoryId, 'mem-9');
      expect(r.modelUsed, 'claude-haiku-4.5');
      expect(r.latencyMs, 412);

      // Invoked the eidolon-respond edge function with the mapped body.
      final req = q.requests.single;
      expect(req.url.path, endsWith('/functions/v1/eidolon-respond'));
    });

    test('defaults are applied for missing optional fields', () async {
      final q = SupabaseQueue()..enqueue(200, {'response': 'Hi.'});

      final result = await _ds(q).sendMessage(
        eidolonId: 'eid-1',
        message: 'Hi',
      );

      expect(result.error, isNull);
      expect(result.value!.newMemoryId, '');
      expect(result.value!.modelUsed, 'unknown');
      expect(result.value!.latencyMs, 0);
    });

    test('non-200 status → NetworkError carrying the function details',
        () async {
      // The Supabase SDK throws FunctionException on a non-2xx invoke, which
      // the datasource maps to a NetworkError with the parsed details.
      final q = SupabaseQueue()..enqueue(500, {'message': 'model timeout'});

      final result = await _ds(q).sendMessage(
        eidolonId: 'eid-1',
        message: 'Hi',
      );

      expect(result.error, isA<NetworkError>());
      final e = result.error! as NetworkError;
      expect(e.statusCode, 500);
      expect(e.message, contains('model timeout'));
    });
  });
}
