import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/core/supabase/supabase_service.dart';
import 'package:eidolon/features/eidolon/domain/repositories/eidolon_respond_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

part 'eidolon_respond_datasource.g.dart';

@riverpod
EidolonRespondDataSource eidolonRespondDataSource(Ref ref) =>
    EidolonRespondDataSource(ref.watch(supabaseClientProvider));

class EidolonRespondDataSource {
  const EidolonRespondDataSource(this._client);
  final SupabaseClient _client;

  Future<Result<EidolonResponse>> sendMessage({
    required String eidolonId,
    required String message,
    String? questContext,
  }) async {
    try {
      final response = await _client.functions.invoke(
        'eidolon-respond',
        body: {
          'eidolonId': eidolonId,
          'eventTrigger': message,
          if (questContext != null) 'questContext': questContext,
        },
      );

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
        EidolonResponse(
          text: data['response'] as String,
          newMemoryId: data['newMemoryId'] as String? ?? '',
          modelUsed: data['modelUsed'] as String? ?? 'unknown',
          latencyMs: (data['latencyMs'] as num?)?.toInt() ?? 0,
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
