import 'package:eidolon/features/morning_report/data/datasources/morning_report_datasource.dart';
import 'package:eidolon/features/morning_report/data/repositories/morning_report_repository_impl.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../home/data/helpers/supabase_queue.dart';

// Thin pass-through; verify each method hits the right table / function via the
// HTTP the underlying builder chain emits.
MorningReportRepositoryImpl _repo(SupabaseQueue q) =>
    MorningReportRepositoryImpl(MorningReportDataSource(q.buildClient()));

void main() {
  test('getLatestUnseen delegates to the overnight_runs table', () async {
    final q = SupabaseQueue()..enqueue(200, const <dynamic>[]);

    final result = await _repo(q).getLatestUnseen();

    expect(result.error, isNull);
    expect(result.value, isNull);
    expect(q.requests.single.url.path, endsWith('/overnight_runs'));
  });

  test('markSeen delegates with a PATCH', () async {
    final q = SupabaseQueue()..enqueue(200, const <dynamic>[]);

    await _repo(q).markSeen('run-1');

    expect(q.requests.single.method, 'PATCH');
  });

  test('simulateNow delegates to the overnight-simulate function', () async {
    final q = SupabaseQueue()..enqueue(200, {'runId': 'run-3'});

    final result = await _repo(q).simulateNow();

    expect(result.value, 'run-3');
    expect(
      q.requests.single.url.path,
      endsWith('/functions/v1/overnight-simulate'),
    );
  });
}
