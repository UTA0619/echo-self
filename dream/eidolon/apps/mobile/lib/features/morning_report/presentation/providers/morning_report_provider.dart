import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/morning_report/data/repositories/morning_report_repository_impl.dart';
import 'package:eidolon/features/morning_report/domain/entities/morning_report.dart';
import 'package:eidolon/features/morning_report/domain/repositories/morning_report_repository.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'morning_report_provider.freezed.dart';
part 'morning_report_provider.g.dart';

@freezed
abstract class MorningReportState with _$MorningReportState {
  const factory MorningReportState({
    MorningReport? report,
    @Default(false) bool isLoading,
    String? errorMessage,
  }) = _MorningReportState;

  const MorningReportState._();

  /// True when there is an unseen report worth surfacing on the home screen.
  bool get hasUnseen => report != null && !report!.seen;
}

@riverpod
class MorningReportNotifier extends _$MorningReportNotifier {
  @override
  MorningReportState build() => const MorningReportState();

  MorningReportRepository get _repo =>
      ref.read(morningReportRepositoryProvider);

  /// Fetch the latest unseen report (called on app resume / home load).
  Future<void> loadLatest() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    final result = await _repo.getLatestUnseen();
    state = result.isSuccess
        ? state.copyWith(isLoading: false, report: result.value)
        : state.copyWith(isLoading: false, errorMessage: _msg(result.error!));
  }

  /// Mark the current report read and drop it from state.
  Future<void> markSeen() async {
    final current = state.report;
    if (current == null) return;
    final result = await _repo.markSeen(current.id);
    if (result.isSuccess) {
      state = state.copyWith(report: null);
    } else {
      state = state.copyWith(errorMessage: _msg(result.error!));
    }
  }

  /// Trigger an on-demand run, then refresh.
  Future<void> simulateNow() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    final result = await _repo.simulateNow();
    if (!result.isSuccess) {
      state =
          state.copyWith(isLoading: false, errorMessage: _msg(result.error!));
      return;
    }
    await loadLatest();
  }

  void clearError() => state = state.copyWith(errorMessage: null);

  static String _msg(AppError error) => switch (error) {
        NetworkError(:final message) => message,
        AuthError(:final message) => message,
        AiError(:final message) => message,
        _ => error.toString(),
      };
}
