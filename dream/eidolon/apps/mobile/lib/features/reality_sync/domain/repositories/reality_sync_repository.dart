import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/reality_sync/domain/entities/health_snapshot.dart';

abstract interface class RealitySyncRepository {
  /// Returns true if the platform has granted health data permission.
  Future<bool> hasPermission();

  /// Requests health data permission from the OS.
  /// Returns true if the user granted it.
  Future<bool> requestPermission();

  /// Fetches today's health snapshot.
  /// Returns [AppError.network] with statusCode 403 if permission is denied.
  Future<Result<HealthSnapshot>> fetchTodaySnapshot();
}
