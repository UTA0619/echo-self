import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/morning_report/domain/entities/morning_report.dart';

abstract interface class MorningReportRepository {
  /// The most recent unopened overnight run, or `null` if there is nothing new.
  Future<Result<MorningReport?>> getLatestUnseen();

  /// Mark a report as read so it no longer surfaces on the home screen.
  Future<Result<void>> markSeen(String runId);

  /// Trigger an on-demand overnight run for the signed-in user (idempotent per
  /// night) so a new player doesn't wait for the nightly batch.
  Future<Result<String>> simulateNow();
}
