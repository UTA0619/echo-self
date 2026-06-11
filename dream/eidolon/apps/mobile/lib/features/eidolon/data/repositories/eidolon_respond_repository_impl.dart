import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/eidolon/data/datasources/eidolon_respond_datasource.dart';
import 'package:eidolon/features/eidolon/domain/repositories/eidolon_respond_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'eidolon_respond_repository_impl.g.dart';

@Riverpod(keepAlive: true)
EidolonRespondRepository eidolonRespondRepository(Ref ref) =>
    EidolonRespondRepositoryImpl(ref.watch(eidolonRespondDataSourceProvider));

class EidolonRespondRepositoryImpl implements EidolonRespondRepository {
  const EidolonRespondRepositoryImpl(this._source);
  final EidolonRespondDataSource _source;

  @override
  Future<Result<EidolonResponse>> sendMessage({
    required String eidolonId,
    required String message,
    String? questContext,
  }) =>
      _source.sendMessage(
        eidolonId: eidolonId,
        message: message,
        questContext: questContext,
      );
}
