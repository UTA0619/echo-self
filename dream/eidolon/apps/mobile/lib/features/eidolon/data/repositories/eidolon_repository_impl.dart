import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/eidolon/data/datasources/eidolon_supabase_datasource.dart';
import 'package:eidolon/features/eidolon/domain/entities/chat_message.dart';
import 'package:eidolon/features/eidolon/domain/repositories/eidolon_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_types/shared_types.dart';

part 'eidolon_repository_impl.g.dart';

@Riverpod(keepAlive: true)
EidolonRepository eidolonRepository(Ref ref) =>
    EidolonRepositoryImpl(ref.watch(eidolonSupabaseDataSourceProvider));

class EidolonRepositoryImpl implements EidolonRepository {
  const EidolonRepositoryImpl(this._source);
  final EidolonSupabaseDataSource _source;

  @override
  Future<Result<EidolonProfile>> getEidolonForCurrentUser() =>
      _source.getEidolonForCurrentUser();

  @override
  Future<Result<List<MemoryEntry>>> getRecentMemories({
    required String eidolonId,
    int limit = 20,
  }) =>
      _source.getRecentMemories(eidolonId: eidolonId, limit: limit);

  @override
  Future<Result<List<ChatMessage>>> getChatHistory({
    required String eidolonId,
    int limit = 50,
  }) =>
      _source.getChatHistory(eidolonId: eidolonId, limit: limit);
}
