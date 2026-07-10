import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/weekly_reflection/data/datasources/weekly_reflection_datasource.dart';
import 'package:eidolon/features/weekly_reflection/domain/entities/weekly_reflection.dart';

abstract interface class WeeklyReflectionRepository {
  /// The most recent unopened weekly reflection, or `null` if there is nothing new.
  Future<Result<WeeklyReflection?>> getLatestUnseen();

  /// Mark a reflection as read so it no longer surfaces on the home screen.
  Future<Result<void>> markSeen(String reflectionId);

  /// Trigger an on-demand reflection (paid-tier only; see [ReflectionRequestResult]).
  Future<Result<ReflectionRequestResult>> generateNow();
}
