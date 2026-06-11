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

  static SubscriptionTier fromValue(String value) =>
      SubscriptionTier.values.firstWhere((t) => t.value == value);
}
