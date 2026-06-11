import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:eidolon/features/auth/domain/repositories/auth_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'sign_out_usecase.g.dart';

@riverpod
SignOutUseCase signOutUseCase(Ref ref) =>
    SignOutUseCase(ref.watch(authRepositoryProvider));

class SignOutUseCase {
  const SignOutUseCase(this._repo);
  final AuthRepository _repo;

  Future<Result<void>> call() => _repo.signOut();
}
