import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class HomeShell extends StatelessWidget {
  const HomeShell({super.key, required this.navigationShell});
  final StatefulNavigationShell navigationShell;

  List<NavigationDestination> _destinations(BuildContext context) => [
        NavigationDestination(
          icon: const Icon(Icons.home_outlined),
          selectedIcon: const Icon(Icons.home),
          label: 'Home',
        ),
        NavigationDestination(
          icon: const Icon(Icons.person_outline),
          selectedIcon: const Icon(Icons.person),
          label: context.l10n.homeTabEidolon,
        ),
        NavigationDestination(
          icon: const Icon(Icons.castle_outlined),
          selectedIcon: const Icon(Icons.castle),
          label: context.l10n.homeTabDungeon,
        ),
        NavigationDestination(
          icon: const Icon(Icons.diamond_outlined),
          selectedIcon: const Icon(Icons.diamond),
          label: 'Gacha',
        ),
        NavigationDestination(
          icon: const Icon(Icons.settings_outlined),
          selectedIcon: const Icon(Icons.settings),
          label: 'Settings',
        ),
      ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: EidolonColors.background,
      body: navigationShell,
      bottomNavigationBar: Theme(
        data: Theme.of(context).copyWith(
          navigationBarTheme: NavigationBarThemeData(
            backgroundColor: EidolonColors.surface,
            indicatorColor: EidolonColors.accent.withValues(alpha: 0.2),
            labelTextStyle: WidgetStateProperty.resolveWith((states) {
              if (states.contains(WidgetState.selected)) {
                return const TextStyle(
                  color: EidolonColors.accent,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                );
              }
              return const TextStyle(
                color: EidolonColors.textSecondary,
                fontSize: 11,
              );
            }),
            iconTheme: WidgetStateProperty.resolveWith((states) {
              if (states.contains(WidgetState.selected)) {
                return const IconThemeData(color: EidolonColors.accent);
              }
              return const IconThemeData(color: EidolonColors.textSecondary);
            }),
          ),
        ),
        child: NavigationBar(
          selectedIndex: navigationShell.currentIndex,
          onDestinationSelected: (index) => navigationShell.goBranch(
            index,
            initialLocation: index == navigationShell.currentIndex,
          ),
          destinations: _destinations(context),
        ),
      ),
    );
  }
}
