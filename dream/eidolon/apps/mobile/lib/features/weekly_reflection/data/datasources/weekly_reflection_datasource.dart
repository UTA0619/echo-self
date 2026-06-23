import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/core/supabase/supabase_service.dart';
import 'package:eidolon/features/weekly_reflection/data/models/weekly_reflection_model.dart';
import 'package:eidolon/features/weekly_reflection/domain/entities/weekly_reflection.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

part 'weekly_reflection_datasource.g.dart';

/// Outcome of an on-demand reflection request. [eligible] is false for free-tier
/// users — the weekly reflection is a paid relationship perk (STRATEGY §6).
class ReflectionRequestResult {
  const ReflectionRequestResult({required this.eligible, this.reflectionId});
  final bool eligible;
  final String? reflectionId;
}

@riverpod
WeeklyReflectionDataSource weeklyReflectionDataSource(Ref ref) =>
    WeeklyReflectionDataSource(ref.watch(supabaseClientProvider));

class WeeklyReflectionDataSource {
  const WeeklyReflectionDataSource(this._client);
  final SupabaseClient _client;

  /// The most recent reflection the player has not yet opened, or `null`.
  /// RLS scopes the query to the signed-in user.
  Future<Result<WeeklyReflection?>> getLatestUnseen() async {
    try {
      final rows = await _client
          .from('weekly_reflections')
          .select('*')
          .isFilter('seen_at', null)
          .order('week_start', ascending: false)
          .limit(1);

      final list = rows as List;
      if (list.isEmpty) return ok<WeeklyReflection?>(null);
      return ok<WeeklyReflection?>(
        WeeklyReflectionModel.fromRow(list.first as Map<String, dynamic>),
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

  /// Mark a reflection as read so it no longer surfaces on the home screen.
  Future<Result<void>> markSeen(String reflectionId) async {
    try {
      await _client
          .from('weekly_reflections')
          .update({'seen_at': DateTime.now().toUtc().toIso8601String()}).eq(
        'id',
        reflectionId,
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

  /// On-demand generation (JWT mode). Returns eligibility — free-tier users get
  /// `eligible: false` rather than a fabricated reflection.
  Future<Result<ReflectionRequestResult>> generateNow() async {
    try {
      final response = await _client.functions.invoke('weekly-reflect');
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
      return ok(
        ReflectionRequestResult(
          eligible: (data['eligible'] as bool?) ?? false,
          reflectionId: data['reflectionId'] as String?,
        ),
      );
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
