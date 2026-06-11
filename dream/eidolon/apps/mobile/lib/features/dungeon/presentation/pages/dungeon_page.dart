import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/dungeon/presentation/providers/dungeon_provider.dart';
import 'package:eidolon/features/dungeon/presentation/widgets/dungeon_views.dart';
import 'package:eidolon/features/eidolon/presentation/providers/eidolon_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class DungeonPage extends ConsumerStatefulWidget {
  const DungeonPage({super.key});

  @override
  ConsumerState<DungeonPage> createState() => _DungeonPageState();
}

class _DungeonPageState extends ConsumerState<DungeonPage> {
  @override
  void initState() {
    super.initState();
    Future.microtask(_checkForActiveRun);
  }

  void _checkForActiveRun() {
    final eidolonId = ref.read(eidolonNotifierProvider).eidolon?.id;
    if (eidolonId != null) {
      ref.read(dungeonNotifierProvider.notifier).checkForActiveRun(eidolonId);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(dungeonNotifierProvider);

    return Scaffold(
      backgroundColor: EidolonColors.background,
      body: SafeArea(
        child: switch (state.phase) {
          DungeonPhase.hub => DungeonHubView(state: state),
          DungeonPhase.generating => const DungeonGeneratingView(),
          DungeonPhase.run => DungeonRunView(state: state),
          DungeonPhase.result => DungeonResultView(state: state),
        },
      ),
    );
  }
}
