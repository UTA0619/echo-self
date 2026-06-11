import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/reality_sync/domain/entities/health_snapshot.dart';
import 'package:eidolon/features/reality_sync/domain/repositories/reality_sync_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:health/health.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'reality_sync_repository_impl.g.dart';

@Riverpod(keepAlive: true)
RealitySyncRepository realitySyncRepository(Ref ref) =>
    RealitySyncRepositoryImpl();

class RealitySyncRepositoryImpl implements RealitySyncRepository {
  /// [health] is injectable so the Health Connect / HealthKit plugin can be
  /// faked in tests; defaults to a real [Health] instance in production.
  RealitySyncRepositoryImpl({Health? health}) : _health = health ?? Health();

  static const _types = [
    HealthDataType.STEPS,
    HealthDataType.SLEEP_ASLEEP,
    HealthDataType.ACTIVE_ENERGY_BURNED,
  ];

  final Health _health;

  @override
  Future<bool> hasPermission() async {
    try {
      return await _health.hasPermissions(_types) ?? false;
    } catch (_) {
      return false;
    }
  }

  @override
  Future<bool> requestPermission() async {
    try {
      await _health.configure();
      return await _health.requestAuthorization(_types);
    } catch (_) {
      return false;
    }
  }

  @override
  Future<Result<HealthSnapshot>> fetchTodaySnapshot() async {
    try {
      final granted = await hasPermission();
      if (!granted) {
        return err(
          const AppError.network(
            message: 'Health permission not granted.',
            statusCode: 403,
          ),
        );
      }

      final now = DateTime.now();
      final midnight = DateTime(now.year, now.month, now.day);

      // Steps
      final stepsRaw = await _health.getTotalStepsInInterval(midnight, now);
      final steps = stepsRaw ?? 0;

      // Sleep (last night: yesterday midnight → today midnight)
      final sleepStart = midnight.subtract(const Duration(hours: 12));
      final sleepPoints = await _health.getHealthDataFromTypes(
        startTime: sleepStart,
        endTime: now,
        types: [HealthDataType.SLEEP_ASLEEP],
      );
      final sleepHours = sleepPoints.fold<double>(0.0, (sum, dp) {
        return sum + dp.dateTo.difference(dp.dateFrom).inMinutes / 60.0;
      });

      // Calories burned
      final calPoints = await _health.getHealthDataFromTypes(
        startTime: midnight,
        endTime: now,
        types: [HealthDataType.ACTIVE_ENERGY_BURNED],
      );
      final calories = calPoints.fold<double>(0.0, (sum, dp) {
        final v = dp.value;
        return sum +
            (v is NumericHealthValue ? v.numericValue.toDouble() : 0.0);
      });

      return ok(
        HealthSnapshot(
          stepsToday: steps,
          sleepHoursLast: sleepHours,
          caloriesBurned: calories,
          fetchedAt: now,
        ),
      );
    } catch (e, st) {
      return err(AppError.unknown(error: e, stackTrace: st));
    }
  }
}
