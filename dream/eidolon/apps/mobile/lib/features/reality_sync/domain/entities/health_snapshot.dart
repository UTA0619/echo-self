import 'package:freezed_annotation/freezed_annotation.dart';

part 'health_snapshot.g.dart';
part 'health_snapshot.freezed.dart';

@freezed
abstract class HealthSnapshot with _$HealthSnapshot {
  const factory HealthSnapshot({
    required int stepsToday,
    required double sleepHoursLast,
    required double caloriesBurned,
    required DateTime fetchedAt,
  }) = _HealthSnapshot;

  factory HealthSnapshot.fromJson(Map<String, dynamic> json) =>
      _$HealthSnapshotFromJson(json);
}
