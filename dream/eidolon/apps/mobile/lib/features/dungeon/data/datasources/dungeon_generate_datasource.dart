import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/core/supabase/supabase_service.dart';
import 'package:eidolon/features/dungeon/domain/entities/dungeon_generate_response.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_types/shared_types.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

part 'dungeon_generate_datasource.g.dart';

@riverpod
DungeonGenerateDataSource dungeonGenerateDataSource(Ref ref) =>
    DungeonGenerateDataSource(ref.watch(supabaseClientProvider));

class DungeonGenerateDataSource {
  const DungeonGenerateDataSource(this._client);
  final SupabaseClient _client;

  Future<Result<DungeonGenerateResult>> generate({
    required String eidolonId,
    int difficulty = 1,
    DungeonTheme? theme,
  }) async {
    try {
      final response = await _client.functions.invoke(
        'dungeon-generate',
        body: {
          'eidolonId': eidolonId,
          'difficulty': difficulty,
          if (theme != null) 'theme': theme.dbValue,
        },
      );

      if (response.status != 200) {
        final error = response.data as Map<String, dynamic>?;
        return err(
          AppError.network(
            message:
                error?['message'] as String? ?? 'Dungeon generation failed',
            statusCode: response.status,
          ),
        );
      }

      final data = response.data as Map<String, dynamic>;
      final dungeonId = data['dungeonId'] as String;

      // Build the Dungeon domain object from the response
      final rooms = (data['rooms'] as List<dynamic>? ?? [])
          .map((r) => DungeonRoom.fromJson(r as Map<String, dynamic>))
          .toList();

      final dungeon = Dungeon(
        id: dungeonId,
        theme: theme ?? DungeonTheme.forest,
        difficulty: difficulty,
        name: data['name'] as String? ?? 'Unnamed Dungeon',
        narrativeIntro: data['narrativeIntro'] as String? ?? '',
        rooms: rooms,
        bossConfig: (data['bossConfig'] as Map<String, dynamic>?) ?? {},
        createdAt: DateTime.now(),
        expiresAt: DateTime.now().add(const Duration(hours: 24)),
      );

      return ok(
        DungeonGenerateResult(
          dungeon: dungeon,
          modelUsed: data['modelUsed'] as String? ?? 'unknown',
          generationMs: (data['generationMs'] as num?)?.toInt() ?? 0,
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
