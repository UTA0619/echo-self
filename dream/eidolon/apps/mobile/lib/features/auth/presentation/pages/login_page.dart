import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/auth/presentation/providers/auth_provider.dart';
import 'package:eidolon/features/auth/presentation/widgets/login_widgets.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Page-local ephemeral UI state (convention: Riverpod for ALL state).
final _isCreatingAccountProvider =
    StateProvider.autoDispose<bool>((_) => false);
final _obscurePasswordProvider = StateProvider.autoDispose<bool>((_) => true);

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final notifier = ref.read(authNotifierProvider.notifier);
    if (ref.read(_isCreatingAccountProvider)) {
      await notifier.createAccount(
        email: _emailCtrl.text.trim(),
        password: _passwordCtrl.text,
      );
    } else {
      await notifier.signInWithEmail(
        email: _emailCtrl.text.trim(),
        password: _passwordCtrl.text,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authNotifierProvider);

    ref.listen(authNotifierProvider, (prev, next) {
      if (next.errorMessage != null &&
          prev?.errorMessage != next.errorMessage) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.errorMessage!),
            backgroundColor: EidolonColors.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
        ref.read(authNotifierProvider.notifier).clearError();
      }
    });

    return Scaffold(
      backgroundColor: EidolonColors.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox(height: 48),
                const LoginLogo(),
                const SizedBox(height: 48),
                LoginFormCard(
                  formKey: _formKey,
                  emailCtrl: _emailCtrl,
                  passwordCtrl: _passwordCtrl,
                  isCreatingAccount: ref.watch(_isCreatingAccountProvider),
                  obscurePassword: ref.watch(_obscurePasswordProvider),
                  isLoading: authState.isLoading,
                  onToggleObscure: () => ref
                      .read(_obscurePasswordProvider.notifier)
                      .update((v) => !v),
                  onToggleMode: () {
                    ref
                        .read(_isCreatingAccountProvider.notifier)
                        .update((v) => !v);
                    ref.read(authNotifierProvider.notifier).clearError();
                  },
                  onSubmit: _submit,
                ),
                const SizedBox(height: 24),
                const LoginDivider(),
                const SizedBox(height: 24),
                LoginSocialButtons(isLoading: authState.isLoading),
                const SizedBox(height: 48),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
