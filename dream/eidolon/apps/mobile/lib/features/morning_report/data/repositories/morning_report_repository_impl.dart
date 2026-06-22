import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/morning_report/data/datasources/morning_report_datasource.dart';
import 'package:eidolon/features/morning_report/domain/entities/morning_report.dart';
import 'package:eidolon/features/morning_report/domain/repositories/morning_report_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'morning_report_repository_impl.g.dart';

@Riverpod(keepAlive: true)
MorningReportRepository morningReportRepository(Ref ref) =>
    MorningReportRepositoryImpl(ref.watch(morningReportDataSourceProvider));

/// Thin pass-through over [MorningReportDataSource].
class MorningReportRepositoryImpl implements MorningReportRepository {
  const MorningReportRepositoryImpl(this._ds);
  final MorningReportDataSource _ds;

  @override
  Future<Result<MorningReport?>> getLatestUnseen() => _ds.getLatestUnseen();

  @override
  Future<Result<bool>> hasRunToday() => _ds.hasRunToday();

  @override
  Future<Result<void>> markSeen(String runId) => _ds.markSeen(runId);

  @override
  Future<Result<String>> simulateNow() => _ds.simulateNow();
}
