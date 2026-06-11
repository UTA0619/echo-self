import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/home/domain/entities/home_summary.dart';
import 'package:shared_types/shared_types.dart';

abstract interface class HomeRepository {
  Future<Result<PlayerProfile>> getPlayerProfile(String authUid);
  Future<Result<HomeSummary>> getHomeSummary(String eidolonId);
}
