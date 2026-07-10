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
    @Default(false) bool todayRunExists,
    @Default(false) bool isDispatching,
    String? errorMessage,
  }) = _MorningReportState;

  const MorningReportState._();

  /// True when there is an unseen report worth surfacing on the home screen.
  bool get hasUnseen => report != null && !report!.seen;

  /// True when the player can send Nova on an on-demand venture: nothing unseen
  /// is waiting and no run has happened today yet (so we don't double-dispatch
  /// or pre-empt the nightly cron).
  bool get canDispatch =>
      !hasUnseen && !todayRunExists && !isLoading && !isDispatching;
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

  /// Home-load entry point: fetch any unseen report AND whether tonight's run
  /// already happened, so the UI can decide between the report card, the
  /// dispatch prompt, or nothing.
  Future<void> refresh() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    final results = await Future.wait([
      _repo.getLatestUnseen(),
      _repo.hasRunToday(),
    ]);
    final unseen = results[0] as Result<MorningReport?>;
    final ranToday = results[1] as Result<bool>;
    state = state.copyWith(
      isLoading: false,
      report: unseen.isSuccess ? unseen.value : state.report,
      todayRunExists:
          ranToday.isSuccess ? (ranToday.value ?? false) : state.todayRunExists,
      errorMessage: unseen.isSuccess ? null : _msg(unseen.error!),
    );
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

  /// Send Nova on an on-demand venture, then surface the resulting report.
  Future<void> simulateNow() async {
    if (state.isDispatching) return;
    state = state.copyWith(isDispatching: true, errorMessage: null);
    final result = await _repo.simulateNow();
    if (!result.isSuccess) {
      state = state.copyWith(
        isDispatching: false,
        errorMessage: _msg(result.error!),
      );
      return;
    }
    // A run now exists for today; pull the fresh (unseen) report into view.
    state = state.copyWith(isDispatching: false, todayRunExists: true);
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
