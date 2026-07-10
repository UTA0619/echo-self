import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/morning_report/domain/entities/morning_report.dart';

abstract interface class MorningReportRepository {
  /// The most recent unopened overnight run, or `null` if there is nothing new.
  Future<Result<MorningReport?>> getLatestUnseen();

  /// Whether tonight's run already exists (seen or not), to gate the on-demand
  /// dispatch prompt so it doesn't double-fire or override the nightly cron.
  Future<Result<bool>> hasRunToday();

  /// Mark a report as read so it no longer surfaces on the home screen.
  Future<Result<void>> markSeen(String runId);

  /// Trigger an on-demand overnight run for the signed-in user (idempotent per
  /// night) so a new player doesn't wait for the nightly batch.
  Future<Result<String>> simulateNow();
}
