import 'package:shared_types/shared_types.dart';

/// Maps a flat Supabase `eidolons` row to [EidolonProfile].
/// The row stores Big Five scores as top-level columns; we nest them into
/// [PersonalityProfile] here so the domain layer stays clean.
class EidolonModel {
  static EidolonProfile fromRow(Map<String, dynamic> row) {
    final personality = PersonalityProfile(
      openness: (row['openness'] as num?)?.toInt() ?? 50,
      conscientiousness: (row['conscientiousness'] as num?)?.toInt() ?? 50,
      extraversion: (row['extraversion'] as num?)?.toInt() ?? 50,
      agreeableness: (row['agreeableness'] as num?)?.toInt() ?? 50,
      neuroticism: (row['neuroticism'] as num?)?.toInt() ?? 50,
    );

    return EidolonProfile(
      id: row['id'] as String,
      userId: row['user_id'] as String,
      name: row['name'] as String,
      level: (row['level'] as num?)?.toInt() ?? 1,
      xp: (row['xp'] as num?)?.toInt() ?? 0,
      xpToNext: (row['xp_to_next'] as num?)?.toInt() ?? 1000,
      personality: personality,
      baseAtk: (row['base_atk'] as num?)?.toInt() ?? 10,
      baseDef: (row['base_def'] as num?)?.toInt() ?? 10,
      baseHp: (row['base_hp'] as num?)?.toInt() ?? 100,
      baseMp: (row['base_mp'] as num?)?.toInt() ?? 50,
      currentMood: EidolonMood.fromString(
        (row['current_mood'] as String?) ?? 'calm',
      ),
      autoStrategy: (row['auto_strategy'] as String?) ?? 'balanced',
      appearance: (row['appearance'] as Map<String, dynamic>?) ?? {},
      createdAt: DateTime.parse(row['created_at'] as String),
      updatedAt: DateTime.parse(row['updated_at'] as String),
    );
  }
}
