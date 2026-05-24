import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/core/supabase/supabase_service.dart';
import 'package:eidolon/features/onboarding/domain/entities/big_five_question.dart';
import 'package:eidolon/features/onboarding/domain/entities/onboarding_state.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

part 'complete_onboarding_usecase.g.dart';

@riverpod
CompleteOnboardingUseCase completeOnboardingUseCase(Ref ref) =>
    CompleteOnboardingUseCase(ref.watch(supabaseClientProvider));

class CompleteOnboardingUseCase {
  CompleteOnboardingUseCase(this._supabase);
  final SupabaseClient _supabase;

  /// [authUid] must be the Firebase UID stored in `users.auth_uid`.
  Future<Result<void>> call(OnboardingState state, {required String authUid}) async {
    try {
      // 1. Update username
      await _supabase
          .from('users')
          .update({'username': state.username.trim()})
          .eq('auth_uid', authUid);

      // 2. Fetch internal game user id
      final userRow = await _supabase
          .from('users')
          .select('id')
          .eq('auth_uid', authUid)
          .single();

      // 3. Create Eidolon with Big Five scores
      await _supabase.from('eidolons').insert({
        'user_id': userRow['id'],
        'name': state.eidolonName.trim(),
        'openness': state.scoreFor(OceanTrait.openness),
        'conscientiousness': state.scoreFor(OceanTrait.conscientiousness),
        'extraversion': state.scoreFor(OceanTrait.extraversion),
        'agreeableness': state.scoreFor(OceanTrait.agreeableness),
        'neuroticism': state.scoreFor(OceanTrait.neuroticism),
      });

      return ok(null);
    } on PostgrestException catch (e) {
      return err(AppError.network(message: e.message, statusCode: int.tryParse(e.code ?? '')));
    } catch (e, st) {
      return err(AppError.unknown(error: e, stackTrace: st));
    }
  }
}
