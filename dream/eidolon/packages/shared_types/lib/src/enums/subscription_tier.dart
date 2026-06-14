enum SubscriptionTier {
  free('free'),
  soulPass('soul_pass'),
  eternal('eternal');

  const SubscriptionTier(this.value);
  final String value;

  int get monthlyCurrency => switch (this) {
        SubscriptionTier.free => 0,
        SubscriptionTier.soulPass => 600,
        SubscriptionTier.eternal => 1500,
      };

  int get dailyDungeonLimit => switch (this) {
        SubscriptionTier.free => 5,
        SubscriptionTier.soulPass => -1, // unlimited
        SubscriptionTier.eternal => -1,
      };

  bool get hasAds => this == SubscriptionTier.free;
  bool get hasPriorityAi => this == SubscriptionTier.eternal;

  int get cloudSaveSlots => switch (this) {
        SubscriptionTier.free => 1,
        SubscriptionTier.soulPass => 5,
        SubscriptionTier.eternal => -1, // unlimited
      };

  // ── Relationship model (STRATEGY.md §6): paid tiers buy a DEEPER BOND, never
  // power. Memory horizon, cognition quality, reflections, and identity
  // expression — all D3-safe, and they align AI cost with the people who pay. ──

  /// How many days of episodic memory the Twin retains. A longer horizon = a
  /// Twin that remembers more of you = the core thing a deeper bond buys.
  int get memoryHorizonDays => switch (this) {
        SubscriptionTier.free => 30,
        SubscriptionTier.soulPass => 180,
        SubscriptionTier.eternal => -1, // unlimited — it never forgets
      };

  /// The model used for this user's narrative/reasoning. Free runs on the cheap
  /// model so heavy compute is spent on payers — the fix for per-user AI COGS.
  String get cognitionModel => switch (this) {
        SubscriptionTier.free => 'claude-haiku-4-5',
        SubscriptionTier.soulPass => 'claude-sonnet-4-5',
        SubscriptionTier.eternal => 'claude-sonnet-4-5',
      };

  /// The Act-2 "what I noticed about you" weekly reflection (paid only).
  bool get weeklyReflections => this != SubscriptionTier.free;

  /// Personality + appearance customization (identity expression, D3-safe).
  bool get customizationUnlocked => this != SubscriptionTier.free;

  /// Parses a stored tier value, defaulting to [free] for unknown/legacy
  /// strings so a stray DB value can never crash profile loading.
  static SubscriptionTier fromValue(String value) =>
      SubscriptionTier.values.firstWhere(
        (t) => t.value == value,
        orElse: () => SubscriptionTier.free,
      );
}
