import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/core/supabase/supabase_service.dart';
import 'package:eidolon/features/eidolon/data/models/chat_message_model.dart';
import 'package:eidolon/features/eidolon/data/models/eidolon_model.dart';
import 'package:eidolon/features/eidolon/data/models/memory_model.dart';
import 'package:eidolon/features/eidolon/domain/entities/chat_message.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_types/shared_types.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

part 'eidolon_supabase_datasource.g.dart';

@riverpod
EidolonSupabaseDataSource eidolonSupabaseDataSource(Ref ref) =>
    EidolonSupabaseDataSource(ref.watch(supabaseClientProvider));

class EidolonSupabaseDataSource {
  const EidolonSupabaseDataSource(this._client);
  final SupabaseClient _client;

  Future<Result<EidolonProfile>> getEidolonForCurrentUser() async {
    try {
      final authUid = _client.auth.currentUser?.id;
      if (authUid == null) {
        return err(const AppError.auth(message: 'Not authenticated'));
      }

      final userRow = await _client
          .from('users')
          .select('id')
          .eq('auth_uid', authUid)
          .maybeSingle();
      if (userRow == null) {
        return err(const AppError.notFound(resource: 'user'));
      }

      // maybeSingle: a user without an Eidolon (e.g. before onboarding) returns
      // null rather than throwing "Cannot coerce the result to a single JSON
      // object", so the UI can show the "not yet awakened" state gracefully.
      final row = await _client
          .from('eidolons')
          .select('*')
          .eq('user_id', userRow['id'] as String)
          .maybeSingle();
      if (row == null) {
        return err(const AppError.notFound(resource: 'eidolon'));
      }

      return ok(EidolonModel.fromRow(row));
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

  /// Load the persisted conversation (oldest→newest) so the chat survives app
  /// restarts and the companion picks up where it left off.
  Future<Result<List<ChatMessage>>> getChatHistory({
    required String eidolonId,
    int limit = 50,
  }) async {
    try {
      final rows = await _client
          .from('chat_messages')
          .select('*')
          .eq('eidolon_id', eidolonId)
          .order('created_at', ascending: false)
          .limit(limit);

      final messages = (rows as List)
          .map((r) => ChatMessageModel.fromRow(r as Map<String, dynamic>))
          .toList()
          .reversed
          .toList();
      return ok(messages);
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

  Future<Result<List<MemoryEntry>>> getRecentMemories({
    required String eidolonId,
    int limit = 20,
  }) async {
    try {
      final rows = await _client
          .from('memories')
          .select('*')
          .eq('eidolon_id', eidolonId)
          .order('importance', ascending: false)
          .order('created_at', ascending: false)
          .limit(limit);

      final entries = (rows as List)
          .map((r) => MemoryModel.fromRow(r as Map<String, dynamic>))
          .toList();
      return ok(entries);
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
