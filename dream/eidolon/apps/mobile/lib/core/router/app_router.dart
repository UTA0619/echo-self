import 'package:eidolon/features/auth/auth.dart';
import 'package:eidolon/features/dungeon/dungeon.dart';
import 'package:eidolon/features/eidolon/eidolon.dart';
import 'package:eidolon/features/gacha/gacha.dart';
import 'package:eidolon/features/home/home.dart';
import 'package:eidolon/features/onboarding/onboarding.dart';
import 'package:eidolon/features/settings/settings.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'app_router.g.dart';

// Route name constants — use these instead of raw strings
abstract final class Routes {
  static const splash = '/';
  static const login = '/login';
  static const onboarding = '/onboarding';
  static const home = '/home';
  static const eidolon = '/eidolon';
  static const dungeon = '/dungeon';
  static const gacha = '/gacha';
  static const settings = '/settings';
}

@riverpod
GoRouter appRouter(Ref ref) {
  // Notifier that triggers route re-evaluation when auth status changes
  final authRefresh = ValueNotifier<int>(0);
  ref.listen(authNotifierProvider, (prev, next) {
    if (prev?.status != next.status) authRefresh.value++;
  });
  ref.onDispose(authRefresh.dispose);

  return GoRouter(
    initialLocation: Routes.splash,
    debugLogDiagnostics: false,
    refreshListenable: authRefresh,
    redirect: (context, state) {
      final auth = ref.read(authNotifierProvider);
      final loc = state.matchedLocation;

      switch (auth.status) {
        case AuthStatus.loading:
          // Stay on splash while auth resolves
          return loc == Routes.splash ? null : Routes.splash;

        case AuthStatus.unauthenticated:
          return loc == Routes.login ? null : Routes.login;

        case AuthStatus.onboardingRequired:
          if (loc.startsWith('/onboarding')) return null;
          return Routes.onboarding;

        case AuthStatus.authenticated:
          // Kick out of auth / splash / onboarding screens
          final isAuthScreen = loc == Routes.splash ||
              loc == Routes.login ||
              loc.startsWith('/onboarding');
          return isAuthScreen ? Routes.home : null;
      }
    },
    routes: [
      // ── Splash ────────────────────────────────────────────────────
      GoRoute(
        path: Routes.splash,
        builder: (context, state) => const _SplashScreen(),
      ),

      // ── Login ─────────────────────────────────────────────────────
      GoRoute(
        path: Routes.login,
        builder: (context, state) => const LoginPage(),
      ),

      // ── Onboarding ────────────────────────────────────────────────
      ShellRoute(
        builder: (context, state, child) => OnboardingShell(child: child),
        routes: [
          GoRoute(
            path: Routes.onboarding,
            builder: (context, state) => const WelcomePage(),
          ),
          GoRoute(
            path: '/onboarding/1',
            builder: (context, state) => const UsernamePage(),
          ),
          GoRoute(
            path: '/onboarding/2',
            builder: (context, state) => const PersonalityPage(),
          ),
          GoRoute(
            path: '/onboarding/3',
            builder: (context, state) => const EidolonNamingPage(),
          ),
        ],
      ),

      // ── Home (5-tab shell) ────────────────────────────────────────
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            HomeShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.home,
                builder: (context, state) => const HomeHubPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.eidolon,
                builder: (context, state) => const EidolonPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.dungeon,
                builder: (context, state) => const DungeonPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.gacha,
                builder: (context, state) => const GachaPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.settings,
                builder: (context, state) => const SettingsPage(),
              ),
            ],
          ),
        ],
      ),
    ],
    errorBuilder: (context, state) => _ErrorPage(error: state.error),
  );
}

// ── Splash screen ──────────────────────────────────────────────────────────

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'EIDOLON',
              style: Theme.of(context).textTheme.displayLarge?.copyWith(
                    letterSpacing: 8,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'YOUR SOUL-TWIN AWAITS',
              style: Theme.of(context).textTheme.labelSmall,
            ),
            const SizedBox(height: 32),
            const CircularProgressIndicator(),
          ],
        ),
      ),
    );
  }
}

// ── Error page ─────────────────────────────────────────────────────────────

class _ErrorPage extends StatelessWidget {
  const _ErrorPage({this.error});
  final Exception? error;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('404', style: Theme.of(context).textTheme.displayLarge),
            const SizedBox(height: 8),
            Text(
              error?.toString() ?? 'Page not found',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 24),
            OutlinedButton(
              onPressed: () => context.go(Routes.splash),
              child: const Text('Return Home'),
            ),
          ],
        ),
      ),
    );
  }
}
