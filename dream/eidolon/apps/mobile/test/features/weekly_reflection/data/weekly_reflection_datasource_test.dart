import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/weekly_reflection/data/datasources/weekly_reflection_datasource.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../home/data/helpers/supabase_queue.dart';

WeeklyReflectionDataSource _ds(SupabaseQueue q) =>
    WeeklyReflectionDataSource(q.buildClient());

Map<String, dynamic> _row({String? seenAt}) => {
      'id': 'wr-1',
      'week_start': '2026-06-08',
      'reflection':
          'You showed up for yourself this week, quietly and steadily.',
      'observation': 'You talked to me most on the mornings after good sleep.',
      'nudge': 'Maybe protect that bedtime a little.',
      'seen_at': seenAt,
    };

void main() {
  group('getLatestUnseen', () {
    test('maps the latest unseen row into a WeeklyReflection', () async {
      final q = SupabaseQueue()..enqueue(200, [_row()]);

      final result = await _ds(q).getLatestUnseen();

      expect(result.error, isNull);
      final wr = result.value!;
      expect(wr.id, 'wr-1');
      expect(wr.reflection, contains('showed up'));
      expect(wr.observation, contains('good sleep'));
      expect(wr.hasNudge, isTrue);
      expect(wr.seen, isFalse);

      final req = q.requests.single;
      expect(req.url.path, endsWith('/weekly_reflections'));
      expect(req.url.query, contains('seen_at=is.null'));
    });

    test('returns null when there is nothing new', () async {
      final q = SupabaseQueue()..enqueue(200, const <dynamic>[]);

      final result = await _ds(q).getLatestUnseen();

      expect(result.error, isNull);
      expect(result.value, isNull);
    });

    test('Postgrest failure → NetworkError', () async {
      final q = SupabaseQueue()..enqueue(500, pgError);

      final result = await _ds(q).getLatestUnseen();

      expect(result.error, isA<NetworkError>());
    });
  });

  group('markSeen', () {
    test('PATCHes seen_at on the target row', () async {
      final q = SupabaseQueue()..enqueue(200, const <dynamic>[]);

      final result = await _ds(q).markSeen('wr-1');

      expect(result.error, isNull);
      final req = q.requests.single;
      expect(req.method, 'PATCH');
      expect(req.url.query, contains('id=eq.wr-1'));
    });
  });

  group('generateNow', () {
    test('paid user → eligible with a reflection id', () async {
      final q = SupabaseQueue()
        ..enqueue(
          200,
          {'mode': 'user', 'eligible': true, 'reflectionId': 'wr-9'},
        );

      final result = await _ds(q).generateNow();

      expect(result.error, isNull);
      expect(result.value!.eligible, isTrue);
      expect(result.value!.reflectionId, 'wr-9');
      expect(
        q.requests.single.url.path,
        endsWith('/functions/v1/weekly-reflect'),
      );
    });

    test('free user → not eligible (no fabricated reflection)', () async {
      final q = SupabaseQueue()
        ..enqueue(200, {'mode': 'user', 'eligible': false});

      final result = await _ds(q).generateNow();

      expect(result.error, isNull);
      expect(result.value!.eligible, isFalse);
      expect(result.value!.reflectionId, isNull);
    });

    test('non-200 → NetworkError', () async {
      final q = SupabaseQueue()..enqueue(500, {'message': 'boom'});

      final result = await _ds(q).generateNow();

      expect(result.error, isA<NetworkError>());
    });
  });
}
