import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/weekly_reflection/data/datasources/weekly_reflection_datasource.dart';
import 'package:eidolon/features/weekly_reflection/domain/entities/weekly_reflection.dart';
import 'package:eidolon/features/weekly_reflection/domain/repositories/weekly_reflection_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'weekly_reflection_repository_impl.g.dart';

@Riverpod(keepAlive: true)
WeeklyReflectionRepository weeklyReflectionRepository(Ref ref) =>
    WeeklyReflectionRepositoryImpl(
      ref.watch(weeklyReflectionDataSourceProvider),
    );

/// Thin pass-through over [WeeklyReflectionDataSource].
class WeeklyReflectionRepositoryImpl implements WeeklyReflectionRepository {
  const WeeklyReflectionRepositoryImpl(this._ds);
  final WeeklyReflectionDataSource _ds;

  @override
  Future<Result<WeeklyReflection?>> getLatestUnseen() => _ds.getLatestUnseen();

  @override
  Future<Result<void>> markSeen(String reflectionId) =>
      _ds.markSeen(reflectionId);

  @override
  Future<Result<ReflectionRequestResult>> generateNow() => _ds.generateNow();
}
