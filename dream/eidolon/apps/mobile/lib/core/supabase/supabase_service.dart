import 'package:eidolon/core/env/app_env.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

part 'supabase_service.g.dart';

Future<void> initSupabase() async {
  await Supabase.initialize(
    url: AppEnv.supabaseUrl,
    anonKey: AppEnv.supabaseAnonKey,
    authOptions: const FlutterAuthClientOptions(
      authFlowType: AuthFlowType.pkce,
    ),
    realtimeClientOptions: const RealtimeClientOptions(
      logLevel: RealtimeLogLevel.info,
    ),
    storageOptions: const StorageClientOptions(
      retryAttempts: 3,
    ),
  );
}

@riverpod
SupabaseClient supabaseClient(Ref ref) => Supabase.instance.client;

/// Emits the current Supabase [User] (or null) on every auth change.
/// Replaces Firebase's authStateChanges as the single source of auth truth.
@riverpod
Stream<User?> supabaseAuthState(Ref ref) {
  final client = ref.watch(supabaseClientProvider);
  // Emit the current session immediately, then every subsequent change.
  return client.auth.onAuthStateChange.map((event) => event.session?.user);
}

// Typed table accessors — prevents raw string table names in feature code

extension SupabaseClientX on SupabaseClient {
  SupabaseQueryBuilder get usersTable => from('users');
  SupabaseQueryBuilder get eidolonsTable => from('eidolons');
  SupabaseQueryBuilder get memoriesTable => from('memories');
  SupabaseQueryBuilder get dungeonsTable => from('dungeons');
  SupabaseQueryBuilder get runsTable => from('runs');
  SupabaseQueryBuilder get visitsTable => from('visits');
  SupabaseQueryBuilder get guildsTable => from('guilds');
  SupabaseQueryBuilder get guildMembersTable => from('guild_members');
  SupabaseQueryBuilder get subscriptionsTable => from('subscriptions');
  SupabaseQueryBuilder get gachaPullsTable => from('gacha_pulls');
}
