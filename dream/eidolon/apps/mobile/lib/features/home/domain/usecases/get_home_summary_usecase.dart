import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/home/data/repositories/home_repository_impl.dart';
import 'package:eidolon/features/home/domain/entities/home_summary.dart';
import 'package:eidolon/features/home/domain/repositories/home_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'get_home_summary_usecase.g.dart';

@riverpod
GetHomeSummaryUseCase getHomeSummaryUseCase(Ref ref) =>
    GetHomeSummaryUseCase(ref.watch(homeRepositoryProvider));

class GetHomeSummaryUseCase {
  const GetHomeSummaryUseCase(this._repo);
  final HomeRepository _repo;

  Future<Result<HomeSummary>> call(String eidolonId) =>
      _repo.getHomeSummary(eidolonId);
}
