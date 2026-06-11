import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/home/data/datasources/home_supabase_datasource.dart';
import 'package:eidolon/features/home/domain/entities/home_summary.dart';
import 'package:eidolon/features/home/domain/repositories/home_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_types/shared_types.dart';

part 'home_repository_impl.g.dart';

@Riverpod(keepAlive: true)
HomeRepository homeRepository(Ref ref) =>
    HomeRepositoryImpl(ref.watch(homeSupabaseDataSourceProvider));

class HomeRepositoryImpl implements HomeRepository {
  const HomeRepositoryImpl(this._datasource);
  final HomeSupabaseDataSource _datasource;

  @override
  Future<Result<PlayerProfile>> getPlayerProfile(String authUid) =>
      _datasource.getPlayerProfile(authUid);

  @override
  Future<Result<HomeSummary>> getHomeSummary(String eidolonId) =>
      _datasource.getHomeSummary(eidolonId);
}
