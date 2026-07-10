import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/weekly_reflection/data/datasources/weekly_reflection_datasource.dart';
import 'package:eidolon/features/weekly_reflection/data/repositories/weekly_reflection_repository_impl.dart';
import 'package:eidolon/features/weekly_reflection/domain/entities/weekly_reflection.dart';
import 'package:eidolon/features/weekly_reflection/domain/repositories/weekly_reflection_repository.dart';
import 'package:eidolon/features/weekly_reflection/presentation/providers/weekly_reflection_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _FakeRepo implements WeeklyReflectionRepository {
  _FakeRepo({
    Result<WeeklyReflection?>? latest,
    Result<void>? seen,
    Result<ReflectionRequestResult>? gen,
  })  : _latest = latest ?? ok<WeeklyReflection?>(null),
        _seen = seen ?? ok(null),
        _gen = gen ?? ok(const ReflectionRequestResult(eligible: true));

  Result<WeeklyReflection?> _latest;
  final Result<void> _seen;
  final Result<ReflectionRequestResult> _gen;

  String? seenId;
  int loadCalls = 0;
  int genCalls = 0;

  void nextLatest(Result<WeeklyReflection?> v) => _latest = v;

  @override
  Future<Result<WeeklyReflection?>> getLatestUnseen() async {
    loadCalls++;
    return _latest;
  }

  @override
  Future<Result<void>> markSeen(String id) async {
    seenId = id;
    return _seen;
  }

  @override
  Future<Result<ReflectionRequestResult>> generateNow() async {
    genCalls++;
    return _gen;
  }
}

WeeklyReflection _wr() => WeeklyReflection(
      id: 'wr-1',
      weekStart: DateTime(2026, 6, 8),
      reflection: 'A steady week.',
      observation: 'You wrote most after good sleep.',
      nudge: '',
      seen: false,
    );

ProviderContainer _container(_FakeRepo repo) {
  final c = ProviderContainer(
    overrides: [weeklyReflectionRepositoryProvider.overrideWithValue(repo)],
  );
  addTearDown(c.dispose);
  return c;
}

void main() {
  group('loadLatest', () {
    test('success with a reflection → stored and unseen', () async {
      final c = _container(_FakeRepo(latest: ok<WeeklyReflection?>(_wr())));

      await c.read(weeklyReflectionNotifierProvider.notifier).loadLatest();

      final s = c.read(weeklyReflectionNotifierProvider);
      expect(s.reflection?.id, 'wr-1');
      expect(s.hasUnseen, isTrue);
      expect(s.isLoading, isFalse);
    });

    test('failure → errorMessage', () async {
      final c = _container(
        _FakeRepo(latest: err(const AppError.network(message: 'offline'))),
      );

      await c.read(weeklyReflectionNotifierProvider.notifier).loadLatest();

      expect(c.read(weeklyReflectionNotifierProvider).errorMessage, 'offline');
    });
  });

  group('markSeen', () {
    test('clears the reflection and forwards the id', () async {
      final repo = _FakeRepo(latest: ok<WeeklyReflection?>(_wr()));
      final c = _container(repo);
      final n = c.read(weeklyReflectionNotifierProvider.notifier);
      await n.loadLatest();

      await n.markSeen();

      expect(repo.seenId, 'wr-1');
      expect(c.read(weeklyReflectionNotifierProvider).reflection, isNull);
    });
  });

  group('generateNow', () {
    test('paid user → reloads and surfaces the reflection', () async {
      final repo = _FakeRepo(
        gen: ok(
          const ReflectionRequestResult(
            eligible: true,
            reflectionId: 'wr-9',
          ),
        ),
      );
      final c = _container(repo);
      repo.nextLatest(ok<WeeklyReflection?>(_wr()));

      await c.read(weeklyReflectionNotifierProvider.notifier).generateNow();

      final s = c.read(weeklyReflectionNotifierProvider);
      expect(repo.genCalls, 1);
      expect(repo.loadCalls, 1);
      expect(s.reflection?.id, 'wr-1');
      expect(s.eligible, isTrue);
      expect(s.isGenerating, isFalse);
    });

    test('free user → marked ineligible, no reload, no fabrication', () async {
      final repo = _FakeRepo(
        gen: ok(const ReflectionRequestResult(eligible: false)),
      );
      final c = _container(repo);

      await c.read(weeklyReflectionNotifierProvider.notifier).generateNow();

      final s = c.read(weeklyReflectionNotifierProvider);
      expect(s.eligible, isFalse);
      expect(repo.loadCalls, 0);
      expect(s.reflection, isNull);
    });

    test('re-entry guarded while a generation is in flight', () async {
      final repo = _FakeRepo(
        gen: ok(const ReflectionRequestResult(eligible: true)),
      );
      final c = _container(repo);
      final n = c.read(weeklyReflectionNotifierProvider.notifier);

      final first = n.generateNow();
      await n.generateNow(); // should bail immediately
      await first;

      expect(repo.genCalls, 1);
    });

    test('failure → errorMessage, stays eligible', () async {
      final repo = _FakeRepo(
        gen: err(const AppError.network(message: 'down')),
      );
      final c = _container(repo);

      await c.read(weeklyReflectionNotifierProvider.notifier).generateNow();

      final s = c.read(weeklyReflectionNotifierProvider);
      expect(s.errorMessage, 'down');
      expect(s.isGenerating, isFalse);
    });
  });
}
