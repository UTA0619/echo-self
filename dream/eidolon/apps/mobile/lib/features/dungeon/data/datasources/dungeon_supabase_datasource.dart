import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/core/supabase/supabase_service.dart';
import 'package:eidolon/features/dungeon/data/models/dungeon_model.dart';
import 'package:eidolon/features/dungeon/data/models/dungeon_run_model.dart';
import 'package:eidolon/features/dungeon/domain/entities/dungeon_run.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_types/shared_types.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

part 'dungeon_supabase_datasource.g.dart';

@riverpod
DungeonSupabaseDataSource dungeonSupabaseDataSource(Ref ref) =>
    DungeonSupabaseDataSource(ref.watch(supabaseClientProvider));

class DungeonSupabaseDataSource {
  const DungeonSupabaseDataSource(this._client);
  final SupabaseClient _client;

  Future<Result<Dungeon>> getDungeon(String dungeonId) async {
    try {
      final row = await _client
          .from('dungeons')
          .select('*')
          .eq('id', dungeonId)
          .single();
      return ok(DungeonModel.fromRow(row));
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

  Future<Result<DungeonRun>> startRun({
    required String eidolonId,
    required String dungeonId,
  }) async {
    try {
      final row = await _client
          .from('runs')
          .insert({
            'eidolon_id': eidolonId,
            'dungeon_id': dungeonId,
            'status': 'in_progress',
            'current_room': 0,
          })
          .select()
          .single();
      return ok(DungeonRunModel.fromRow(row));
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

  Future<Result<DungeonRun?>> getActiveRun(String eidolonId) async {
    try {
      final rows = await _client
          .from('runs')
          .select('*')
          .eq('eidolon_id', eidolonId)
          .eq('status', 'in_progress')
          .order('started_at', ascending: false)
          .limit(1);

      final list = rows as List;
      if (list.isEmpty) return ok<DungeonRun?>(null);
      return ok(DungeonRunModel.fromRow(list.first as Map<String, dynamic>));
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

  Future<Result<DungeonRun>> advanceRoom(String runId) async {
    try {
      // Fetch current room first
      final current = await _client
          .from('runs')
          .select('current_room')
          .eq('id', runId)
          .single();

      final nextRoom = ((current['current_room'] as num?) ?? 0).toInt() + 1;

      final row = await _client
          .from('runs')
          .update({'current_room': nextRoom})
          .eq('id', runId)
          .select()
          .single();

      return ok(DungeonRunModel.fromRow(row));
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

  Future<Result<DungeonRun>> finishRun(
    String runId,
    RunStatus finalStatus,
  ) async {
    try {
      final statusStr = switch (finalStatus) {
        RunStatus.completed => 'completed',
        RunStatus.failed => 'failed',
        RunStatus.abandoned => 'abandoned',
        _ => 'abandoned',
      };

      final row = await _client
          .from('runs')
          .update({
            'status': statusStr,
            'completed_at': DateTime.now().toIso8601String(),
          })
          .eq('id', runId)
          .select()
          .single();

      return ok(DungeonRunModel.fromRow(row));
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

  /// Credits dungeon reward crystals to the caller's wallet via the
  /// SECURITY DEFINER `credit_crystals` RPC (keyed by users.id, idempotent on
  /// [receiptId]). [authUid] is the Supabase auth uid; we resolve users.id.
  Future<Result<void>> grantCrystals({
    required String authUid,
    required int amount,
    required String receiptId,
  }) async {
    try {
      final userRow = await _client
          .from('users')
          .select('id')
          .eq('auth_uid', authUid)
          .maybeSingle();
      final userId = userRow?['id'] as String?;
      if (userId == null) {
        return err(const AppError.notFound(resource: 'user'));
      }
      await _client.rpc<void>(
        'credit_crystals',
        params: {
          'p_user_id': userId,
          'p_amount': amount,
          'p_receipt_id': receiptId,
        },
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
}
