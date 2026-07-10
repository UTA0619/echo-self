import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/core/supabase/supabase_service.dart';
import 'package:eidolon/features/morning_report/data/models/morning_report_model.dart';
import 'package:eidolon/features/morning_report/domain/entities/morning_report.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

part 'morning_report_datasource.g.dart';

@riverpod
MorningReportDataSource morningReportDataSource(Ref ref) =>
    MorningReportDataSource(ref.watch(supabaseClientProvider));

class MorningReportDataSource {
  const MorningReportDataSource(this._client);
  final SupabaseClient _client;

  /// The most recent overnight run the player has not yet opened.
  /// Returns `null` when there is nothing new to show. RLS scopes the query to
  /// the signed-in user.
  Future<Result<MorningReport?>> getLatestUnseen() async {
    try {
      final rows = await _client
          .from('overnight_runs')
          .select('*')
          .isFilter('seen_at', null)
          .order('run_date', ascending: false)
          .limit(1);

      final list = rows as List;
      if (list.isEmpty) return ok<MorningReport?>(null);
      return ok<MorningReport?>(
        MorningReportModel.fromRow(list.first as Map<String, dynamic>),
      );
    } on PostgrestException catch (e) {
      return err(
        AppError.network(
          message: e.message,
          statusCode: int.tryParse(e.code ?? ''),
        ),
      );
    } catch (e, st) {
      return err(AppError.unknown(error: e, stackTrace: st));
    }
  }

  /// Whether tonight's run already exists (seen or not). Used to gate the
  /// on-demand "send Nova adventuring" prompt so we never dispatch twice in a
  /// day or step on the nightly cron. Matches the Edge Function's UTC run_date.
  Future<Result<bool>> hasRunToday() async {
    try {
      final today = DateTime.now().toUtc().toIso8601String().substring(0, 10);
      final rows = await _client
          .from('overnight_runs')
          .select('id')
          .eq('run_date', today)
          .limit(1);
      return ok((rows as List).isNotEmpty);
    } on PostgrestException catch (e) {
      return err(
        AppError.network(
          message: e.message,
          statusCode: int.tryParse(e.code ?? ''),
        ),
      );
    } catch (e, st) {
      return err(AppError.unknown(error: e, stackTrace: st));
    }
  }

  /// Mark a report as read so it stops surfacing on the home screen.
  Future<Result<void>> markSeen(String runId) async {
    try {
      await _client
          .from('overnight_runs')
          .update({'seen_at': DateTime.now().toUtc().toIso8601String()}).eq(
        'id',
        runId,
      );
      return ok(null);
    } on PostgrestException catch (e) {
      return err(
        AppError.network(
          message: e.message,
          statusCode: int.tryParse(e.code ?? ''),
        ),
      );
    } catch (e, st) {
      return err(AppError.unknown(error: e, stackTrace: st));
    }
  }

  /// On-demand simulation (JWT mode) so a new player doesn't have to wait for
  /// the nightly cron to see their first Morning Report. Idempotent per night.
  Future<Result<String>> simulateNow() async {
    try {
      final response = await _client.functions.invoke('overnight-simulate');
      if (response.status != 200) {
        final error = response.data as Map<String, dynamic>?;
        return err(
          AppError.network(
            message: error?['message'] as String? ?? 'Edge function error',
            statusCode: response.status,
          ),
        );
      }
      final data = response.data as Map<String, dynamic>;
      return ok((data['runId'] as String?) ?? '');
    } on FunctionException catch (e) {
      return err(
        AppError.network(
          message: e.details?.toString() ?? 'Function invocation failed',
          statusCode: e.status,
        ),
      );
    } catch (e, st) {
      return err(AppError.unknown(error: e, stackTrace: st));
    }
  }
}
