import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/core/supabase/supabase_service.dart';
import 'package:eidolon/features/home/data/models/player_profile_model.dart';
import 'package:eidolon/features/home/domain/entities/home_summary.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_types/shared_types.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

part 'home_supabase_datasource.g.dart';

@riverpod
HomeSupabaseDataSource homeSupabaseDataSource(Ref ref) =>
    HomeSupabaseDataSource(ref.watch(supabaseClientProvider));

class HomeSupabaseDataSource {
  const HomeSupabaseDataSource(this._client);
  final SupabaseClient _client;

  Future<Result<PlayerProfile>> getPlayerProfile(String authUid) async {
    try {
      final row = await _client
          .from('users')
          .select('*')
          .eq('auth_uid', authUid)
          .single();
      return ok(PlayerProfileModel.fromRow(row));
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

  Future<Result<HomeSummary>> getHomeSummary(String eidolonId) async {
    try {
      final today = DateTime.now();
      final todayStr =
          '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';

      final rows = await _client
          .from('runs')
          .select('id, status, started_at')
          .eq('eidolon_id', eidolonId)
          .gte('started_at', '${todayStr}T00:00:00')
          .lte('started_at', '${todayStr}T23:59:59');

      final list = rows as List;
      final runsToday = list.length;
      final activeRow = list
          .cast<Map<String, dynamic>>()
          .where(
            (r) => r['status'] == 'in_progress',
          )
          .firstOrNull;

      return ok(
        HomeSummary(
          dungeonRunsToday: runsToday,
          currentStreak: 1,
          hasActiveRun: activeRow != null,
          activeRunId: activeRow?['id'] as String?,
        ),
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
}
