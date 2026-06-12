import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/morning_report/data/datasources/morning_report_datasource.dart';
import 'package:eidolon/features/morning_report/domain/entities/morning_report.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_types/shared_types.dart';

import '../../home/data/helpers/supabase_queue.dart';

MorningReportDataSource _ds(SupabaseQueue q) =>
    MorningReportDataSource(q.buildClient());

Map<String, dynamic> _runRow({String? seenAt}) => {
      'id': 'run-1',
      'run_date': '2026-06-12',
      'theme': 'shadow_realm',
      'narrative': 'Nyx slipped through the mirror world and returned changed.',
      'highlight': 'Nyx braved the shadow realm',
      'mood': 'focused',
      'xp_gained': 120,
      'loot': [
        {'name': 'Mirror Shard', 'rarity': 'epic'},
      ],
      'seen_at': seenAt,
    };

void main() {
  group('getLatestUnseen', () {
    test('maps the latest unseen row into a MorningReport', () async {
      final q = SupabaseQueue()..enqueue(200, [_runRow()]);

      final result = await _ds(q).getLatestUnseen();

      expect(result.error, isNull);
      final report = result.value!;
      expect(report.id, 'run-1');
      expect(report.theme, 'shadow_realm');
      expect(report.mood, EidolonMood.focused);
      expect(report.xpGained, 120);
      expect(report.loot.single.name, 'Mirror Shard');
      expect(report.loot.single.rarity, LootRarity.epic);
      expect(report.seen, isFalse);

      final req = q.requests.single;
      expect(req.url.path, endsWith('/overnight_runs'));
      // Only unseen rows are requested.
      expect(req.url.query, contains('seen_at=is.null'));
    });

    test('returns null when there is nothing new', () async {
      final q = SupabaseQueue()..enqueue(200, const <dynamic>[]);

      final result = await _ds(q).getLatestUnseen();

      expect(result.error, isNull);
      expect(result.value, isNull);
    });

    test('maps a Postgrest failure to a NetworkError', () async {
      final q = SupabaseQueue()..enqueue(500, pgError);

      final result = await _ds(q).getLatestUnseen();

      expect(result.value, isNull);
      expect(result.error, isA<NetworkError>());
    });
  });

  group('markSeen', () {
    test('PATCHes seen_at on the target row', () async {
      final q = SupabaseQueue()..enqueue(200, const <dynamic>[]);

      final result = await _ds(q).markSeen('run-1');

      expect(result.error, isNull);
      final req = q.requests.single;
      expect(req.method, 'PATCH');
      expect(req.url.path, endsWith('/overnight_runs'));
      expect(req.url.query, contains('id=eq.run-1'));
    });
  });

  group('simulateNow', () {
    test('invokes the edge function and returns the new run id', () async {
      final q = SupabaseQueue()
        ..enqueue(200, {'mode': 'user', 'runId': 'run-9'});

      final result = await _ds(q).simulateNow();

      expect(result.error, isNull);
      expect(result.value, 'run-9');
      expect(
        q.requests.single.url.path,
        endsWith('/functions/v1/overnight-simulate'),
      );
    });

    test('non-200 edge response → NetworkError', () async {
      final q = SupabaseQueue()..enqueue(500, {'message': 'boom'});

      final result = await _ds(q).simulateNow();

      expect(result.value, isNull);
      expect(result.error, isA<NetworkError>());
    });
  });
}
