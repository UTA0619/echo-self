import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/morning_report/data/repositories/morning_report_repository_impl.dart';
import 'package:eidolon/features/morning_report/domain/entities/morning_report.dart';
import 'package:eidolon/features/morning_report/domain/repositories/morning_report_repository.dart';
import 'package:eidolon/features/morning_report/presentation/providers/morning_report_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_types/shared_types.dart';

class _FakeRepo implements MorningReportRepository {
  _FakeRepo({
    Result<MorningReport?>? latest,
    Result<void>? seen,
    Result<String>? sim,
  })  : _latest = latest ?? ok<MorningReport?>(null),
        _seen = seen ?? ok(null),
        _sim = sim ?? ok('run-x');

  Result<MorningReport?> _latest;
  final Result<void> _seen;
  final Result<String> _sim;

  String? seenId;
  int loadCalls = 0;
  int simCalls = 0;

  // Lets a test flip what the *next* loadLatest returns (e.g. after simulate).
  void nextLatest(Result<MorningReport?> v) => _latest = v;

  @override
  Future<Result<MorningReport?>> getLatestUnseen() async {
    loadCalls++;
    return _latest;
  }

  @override
  Future<Result<void>> markSeen(String runId) async {
    seenId = runId;
    return _seen;
  }

  @override
  Future<Result<String>> simulateNow() async {
    simCalls++;
    return _sim;
  }
}

MorningReport _report({bool seen = false}) => MorningReport(
      id: 'run-1',
      runDate: DateTime(2026, 6, 12),
      theme: 'forest',
      narrative: 'A quiet night in the glade.',
      highlight: 'Nyx wandered the glade',
      mood: EidolonMood.calm,
      xpGained: 60,
      loot: const [],
      seen: seen,
    );

ProviderContainer _container(_FakeRepo repo) {
  final c = ProviderContainer(
    overrides: [morningReportRepositoryProvider.overrideWithValue(repo)],
  );
  addTearDown(c.dispose);
  return c;
}

void main() {
  group('loadLatest', () {
    test('success with a report → stored and surfaced as unseen', () async {
      final c = _container(_FakeRepo(latest: ok<MorningReport?>(_report())));

      await c.read(morningReportNotifierProvider.notifier).loadLatest();

      final s = c.read(morningReportNotifierProvider);
      expect(s.isLoading, isFalse);
      expect(s.report?.id, 'run-1');
      expect(s.hasUnseen, isTrue);
    });

    test('success with no report → empty state, no unseen', () async {
      final c = _container(_FakeRepo(latest: ok<MorningReport?>(null)));

      await c.read(morningReportNotifierProvider.notifier).loadLatest();

      final s = c.read(morningReportNotifierProvider);
      expect(s.report, isNull);
      expect(s.hasUnseen, isFalse);
    });

    test('failure → errorMessage set', () async {
      final c = _container(
        _FakeRepo(
          latest: err(const AppError.network(message: 'offline')),
        ),
      );

      await c.read(morningReportNotifierProvider.notifier).loadLatest();

      expect(c.read(morningReportNotifierProvider).errorMessage, 'offline');
    });
  });

  group('markSeen', () {
    test('clears the report and forwards the id', () async {
      final repo = _FakeRepo(latest: ok<MorningReport?>(_report()));
      final c = _container(repo);
      final n = c.read(morningReportNotifierProvider.notifier);
      await n.loadLatest();

      await n.markSeen();

      expect(repo.seenId, 'run-1');
      expect(c.read(morningReportNotifierProvider).report, isNull);
    });

    test('no-op when there is no report', () async {
      final repo = _FakeRepo();
      final c = _container(repo);

      await c.read(morningReportNotifierProvider.notifier).markSeen();

      expect(repo.seenId, isNull);
    });
  });

  group('simulateNow', () {
    test('triggers a run then reloads the latest report', () async {
      final repo = _FakeRepo(sim: ok('run-9'));
      final c = _container(repo);
      // After simulation, the next load surfaces the fresh report.
      repo.nextLatest(ok<MorningReport?>(_report()));

      await c.read(morningReportNotifierProvider.notifier).simulateNow();

      expect(repo.simCalls, 1);
      expect(repo.loadCalls, 1);
      expect(c.read(morningReportNotifierProvider).report?.id, 'run-1');
    });

    test('failure surfaces the error and skips the reload', () async {
      final repo = _FakeRepo(
        sim: err(const AppError.network(message: 'no twin')),
      );
      final c = _container(repo);

      await c.read(morningReportNotifierProvider.notifier).simulateNow();

      expect(repo.loadCalls, 0);
      expect(c.read(morningReportNotifierProvider).errorMessage, 'no twin');
    });
  });

  test('clearError removes the message', () async {
    final c = _container(
      _FakeRepo(latest: err(const AppError.network(message: 'x'))),
    );
    final n = c.read(morningReportNotifierProvider.notifier);
    await n.loadLatest();
    expect(c.read(morningReportNotifierProvider).errorMessage, 'x');

    n.clearError();
    expect(c.read(morningReportNotifierProvider).errorMessage, isNull);
  });
}
