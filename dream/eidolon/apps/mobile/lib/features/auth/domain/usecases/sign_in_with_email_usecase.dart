import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:eidolon/features/auth/domain/entities/auth_user.dart';
import 'package:eidolon/features/auth/domain/repositories/auth_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'sign_in_with_email_usecase.g.dart';

@riverpod
SignInWithEmailUseCase signInWithEmailUseCase(Ref ref) =>
    SignInWithEmailUseCase(ref.watch(authRepositoryProvider));

class SignInWithEmailUseCase {
  const SignInWithEmailUseCase(this._repo);
  final AuthRepository _repo;

  Future<Result<AuthUser>> call({
    required String email,
    required String password,
  }) =>
      _repo.signInWithEmail(email: email, password: password);
}
