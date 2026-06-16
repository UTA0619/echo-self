import 'dart:async';

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
    unawaited(Future.microtask(_checkForActiveRun));
  }

  Future<void> _checkForActiveRun() async {
    // The dungeon tab can be opened directly (e.g. after a fresh launch /
    // session restore) before the Eidolon tab has loaded the companion. Without
    // this, eidolon?.id is null and the hub wrongly shows "awaken your Eidolon".
    var eidolonId = ref.read(eidolonNotifierProvider).eidolon?.id;
    if (eidolonId == null) {
      await ref.read(eidolonNotifierProvider.notifier).loadEidolon();
      eidolonId = ref.read(eidolonNotifierProvider).eidolon?.id;
    }
    if (eidolonId != null) {
      await ref
          .read(dungeonNotifierProvider.notifier)
          .checkForActiveRun(eidolonId);
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
