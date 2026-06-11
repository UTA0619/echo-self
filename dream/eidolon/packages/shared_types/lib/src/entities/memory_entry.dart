import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:shared_types/src/enums/memory_type.dart';

part 'memory_entry.freezed.dart';
part 'memory_entry.g.dart';

@freezed
abstract class MemoryEntry with _$MemoryEntry {
  const factory MemoryEntry({
    required String id,
    required String eidolonId,
    required MemoryType memoryType,
    required String content,
    @Default(0.5) double importance,
    String? emotionTag,
    String? source,
    String? sourceRef,
    @Default(0) int accessCount,
    DateTime? lastAccessed,
    required DateTime createdAt,
  }) = _MemoryEntry;

  factory MemoryEntry.fromJson(Map<String, dynamic> json) =>
      _$MemoryEntryFromJson(json);
}
