import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/reality_sync/data/repositories/reality_sync_repository_impl.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:health/health.dart';

// ── Fake Health plugin ────────────────────────────────────────────────────────
// Overrides just the surface the repository touches; flutter_test's Fake
// throws on anything else, guarding against silent reliance on real channels.

class _FakeHealth extends Fake implements Health {
  _FakeHealth({
    this.permissions = true,
    this.authorizes = true,
    this.steps = 0,
    this.throwOnFetch = false,
  });

  bool? permissions;
  bool authorizes;
  int? steps;
  bool throwOnFetch;

  @override
  Future<bool?> hasPermissions(
    List<HealthDataType> types, {
    List<HealthDataAccess>? permissions,
  }) async =>
      this.permissions;

  @override
  Future<void> configure() async {}

  @override
  Future<bool> requestAuthorization(
    List<HealthDataType> types, {
    List<HealthDataAccess>? permissions,
  }) async =>
      authorizes;

  @override
  Future<int?> getTotalStepsInInterval(
    DateTime startTime,
    DateTime endTime, {
    bool includeManualEntry = true,
  }) async {
    if (throwOnFetch) throw Exception('health channel error');
    return steps;
  }

  @override
  Future<List<HealthDataPoint>> getHealthDataFromTypes({
    required List<HealthDataType> types,
    required DateTime startTime,
    required DateTime endTime,
    List<RecordingMethod> recordingMethodsToFilter = const [],
  }) async =>
      const [];
}

void main() {
  group('hasPermission', () {
    test('mirrors the plugin result', () async {
      expect(
        await RealitySyncRepositoryImpl(health: _FakeHealth(permissions: true))
            .hasPermission(),
        isTrue,
      );
      expect(
        await RealitySyncRepositoryImpl(health: _FakeHealth(permissions: false))
            .hasPermission(),
        isFalse,
      );
    });

    test('null plugin result is treated as false', () async {
      final repo =
          RealitySyncRepositoryImpl(health: _FakeHealth(permissions: null));
      expect(await repo.hasPermission(), isFalse);
    });
  });

  group('requestPermission', () {
    test('returns the plugin authorization outcome', () async {
      expect(
        await RealitySyncRepositoryImpl(health: _FakeHealth(authorizes: true))
            .requestPermission(),
        isTrue,
      );
      expect(
        await RealitySyncRepositoryImpl(health: _FakeHealth(authorizes: false))
            .requestPermission(),
        isFalse,
      );
    });
  });

  group('fetchTodaySnapshot', () {
    test('denied permission → NetworkError(403)', () async {
      final repo =
          RealitySyncRepositoryImpl(health: _FakeHealth(permissions: false));

      final result = await repo.fetchTodaySnapshot();

      expect(result.error, isA<NetworkError>());
      expect((result.error! as NetworkError).statusCode, 403);
    });

    test('granted → builds a snapshot (steps counted, no sleep/cal samples)',
        () async {
      final repo = RealitySyncRepositoryImpl(
        health: _FakeHealth(permissions: true, steps: 12345),
      );

      final result = await repo.fetchTodaySnapshot();

      expect(result.error, isNull);
      final s = result.value!;
      expect(s.stepsToday, 12345);
      expect(s.sleepHoursLast, 0);
      expect(s.caloriesBurned, 0);
    });

    test('null steps default to zero', () async {
      final repo = RealitySyncRepositoryImpl(
        health: _FakeHealth(permissions: true, steps: null),
      );

      final result = await repo.fetchTodaySnapshot();

      expect(result.value!.stepsToday, 0);
    });

    test('a thrown plugin error → UnknownError', () async {
      final repo = RealitySyncRepositoryImpl(
        health: _FakeHealth(permissions: true, throwOnFetch: true),
      );

      final result = await repo.fetchTodaySnapshot();

      expect(result.error, isA<UnknownError>());
    });
  });
}
