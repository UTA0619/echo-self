import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/reality_sync/data/repositories/reality_sync_repository_impl.dart';
import 'package:eidolon/features/reality_sync/domain/entities/health_snapshot.dart';
import 'package:eidolon/features/reality_sync/domain/repositories/reality_sync_repository.dart';
import 'package:eidolon/features/reality_sync/presentation/providers/reality_sync_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

// ── Fake repository ───────────────────────────────────────────────────────────

class _FakeRealitySyncRepo implements RealitySyncRepository {
  _FakeRealitySyncRepo({
    this.permission = true,
    this.requestGrants = true,
    this.snapshot,
  });

  bool permission;
  bool requestGrants;
  Result<HealthSnapshot>? snapshot;

  int requestCalls = 0;

  @override
  Future<bool> hasPermission() async => permission;

  @override
  Future<bool> requestPermission() async {
    requestCalls++;
    if (requestGrants) permission = true;
    return requestGrants;
  }

  @override
  Future<Result<HealthSnapshot>> fetchTodaySnapshot() async =>
      snapshot ??
      ok(
        HealthSnapshot(
          stepsToday: 8000,
          sleepHoursLast: 7,
          caloriesBurned: 400,
          fetchedAt: DateTime(2026, 6, 1),
        ),
      );
}

ProviderContainer _container(_FakeRealitySyncRepo repo) {
  final c = ProviderContainer(
    overrides: [realitySyncRepositoryProvider.overrideWithValue(repo)],
  );
  addTearDown(c.dispose);
  c.listen(realitySyncNotifierProvider, (_, __) {});
  return c;
}

Future<void> _settle() async {
  for (var i = 0; i < 5; i++) {
    await Future<void>.delayed(Duration.zero);
  }
}

void main() {
  group('build / _init', () {
    test('with permission → fetches snapshot and computes a bonus', () async {
      final c = _container(_FakeRealitySyncRepo());
      await _settle();

      final s = c.read(realitySyncNotifierProvider);
      expect(s.hasPermission, isTrue);
      expect(s.snapshot, isNotNull);
      expect(s.bonus, isNotNull);
      expect(s.isLoading, isFalse);
    });

    test('without permission → stops, no snapshot', () async {
      final c = _container(_FakeRealitySyncRepo(permission: false));
      await _settle();

      final s = c.read(realitySyncNotifierProvider);
      expect(s.hasPermission, isFalse);
      expect(s.snapshot, isNull);
    });
  });

  group('requestPermissionAndFetch', () {
    test('granted → permission true and snapshot populated', () async {
      final repo = _FakeRealitySyncRepo(permission: false);
      final c = _container(repo);
      await _settle();

      await c
          .read(realitySyncNotifierProvider.notifier)
          .requestPermissionAndFetch();

      final s = c.read(realitySyncNotifierProvider);
      expect(repo.requestCalls, 1);
      expect(s.hasPermission, isTrue);
      expect(s.snapshot, isNotNull);
    });

    test('denied → hasPermission stays false', () async {
      final repo =
          _FakeRealitySyncRepo(permission: false, requestGrants: false);
      final c = _container(repo);
      await _settle();

      await c
          .read(realitySyncNotifierProvider.notifier)
          .requestPermissionAndFetch();

      expect(c.read(realitySyncNotifierProvider).hasPermission, isFalse);
    });
  });

  group('refresh', () {
    test('is a no-op when permission was never granted', () async {
      final repo = _FakeRealitySyncRepo(permission: false);
      final c = _container(repo);
      await _settle();

      await c.read(realitySyncNotifierProvider.notifier).refresh();

      expect(c.read(realitySyncNotifierProvider).snapshot, isNull);
    });

    test('re-fetches when permission is granted', () async {
      final repo = _FakeRealitySyncRepo();
      final c = _container(repo);
      await _settle();

      repo.snapshot = ok(
        HealthSnapshot(
          stepsToday: 20000,
          sleepHoursLast: 8,
          caloriesBurned: 900,
          fetchedAt: DateTime(2026, 6, 2),
        ),
      );
      await c.read(realitySyncNotifierProvider.notifier).refresh();

      expect(
        c.read(realitySyncNotifierProvider).snapshot!.stepsToday,
        20000,
      );
    });
  });

  group('error handling', () {
    test('403 permission error clears hasPermission and shows message',
        () async {
      final repo = _FakeRealitySyncRepo(
        snapshot: err(
          const AppError.network(
            message: 'Health permission not granted.',
            statusCode: 403,
          ),
        ),
      );
      final c = _container(repo);
      await _settle();

      final s = c.read(realitySyncNotifierProvider);
      expect(s.hasPermission, isFalse);
      expect(s.errorMessage, 'Health permission not granted.');
    });

    test('non-403 error keeps permission and surfaces the message', () async {
      final repo = _FakeRealitySyncRepo(
        snapshot: err(const AppError.network(message: 'offline')),
      );
      final c = _container(repo);
      await _settle();

      final s = c.read(realitySyncNotifierProvider);
      expect(s.hasPermission, isTrue);
      expect(s.errorMessage, 'offline');
    });
  });
}
