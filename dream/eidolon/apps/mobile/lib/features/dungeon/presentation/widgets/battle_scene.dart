import 'dart:math' as math;

import 'package:eidolon/features/eidolon/presentation/widgets/avatar_genes.dart';
import 'package:eidolon/features/eidolon/presentation/widgets/eidolon_avatar.dart';
import 'package:flutter/material.dart';
import 'package:shared_types/shared_types.dart';

/// A self-running 2D auto-battler: the player's Eidolon and an enemy trade
/// blows on a clock — lunges, hit-shakes, floating damage and animating HP bars
/// — until one falls. Reuses [EidolonAvatar] for both fighters. Pure ticker +
/// a plain model mutated inside the controller listener (no [setState]).
class BattleScene extends StatefulWidget {
  const BattleScene({
    super.key,
    this.playerGenes = AvatarGenes.fallback,
    this.playerName = 'Eidolon',
    this.enemyName = 'Shade',
    this.difficulty = 1,
    this.onFinished,
  });

  final AvatarGenes playerGenes;
  final String playerName;
  final String enemyName;

  /// 1–10. Scales enemy HP and damage so higher tiers carry real risk.
  final int difficulty;
  final void Function(bool victory)? onFinished;

  @override
  State<BattleScene> createState() => _BattleSceneState();
}

class _BattleSceneState extends State<BattleScene>
    with SingleTickerProviderStateMixin {
  static const _enemyGenes = AvatarGenes(
    primary: Color(0xFFE2574A),
    secondary: Color(0xFF6E1F1B),
    body: BodyForm.chubby,
    crown: CrownType.horns,
    marking: Marking.spots,
    sparkles: 0,
    eyeSpacing: 0.14,
  );

  final _rng = math.Random();
  late final AnimationController _c;

  late double _playerHp = _maxPlayer;
  late double _enemyHp = _maxEnemy;
  final double _maxPlayer = 100;
  late final double _maxEnemy = 56 + widget.difficulty * 9.0;
  bool _playerTurn = true;
  bool _finished = false;
  bool _victory = false;
  int _hitAmount = 0;
  bool _hitOnPlayer = false;
  double _lastValue = 0;
  bool _notified = false;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1100),
    )
      ..addListener(_onTick)
      ..repeat();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  void _onTick() {
    // A new cycle wrapped → resolve one attack.
    if (_c.value < _lastValue && !_finished) _resolveTurn();
    _lastValue = _c.value;
    if (_finished && !_notified) {
      _notified = true;
      widget.onFinished?.call(_victory);
    }
  }

  void _resolveTurn() {
    final dmg = _playerTurn
        ? 14 + _rng.nextInt(13)
        : 5 + (widget.difficulty * 1.4).round() + _rng.nextInt(7);
    _hitAmount = dmg;
    _hitOnPlayer = !_playerTurn;
    if (_playerTurn) {
      _enemyHp = math.max(0, _enemyHp - dmg);
    } else {
      _playerHp = math.max(0, _playerHp - dmg);
    }
    if (_enemyHp <= 0 || _playerHp <= 0) {
      _finished = true;
      _victory = _enemyHp <= 0;
      _c.stop();
      return;
    }
    _playerTurn = !_playerTurn;
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (context, _) {
        final t = _c.value;
        final lunge = _finished ? 0.0 : math.sin(t * math.pi) * 26;
        return LayoutBuilder(
          builder: (context, box) {
            final w = box.maxWidth;
            return SizedBox(
              height: 320,
              width: w,
              child: Stack(
                children: [
                  _hpBar(
                    left: true,
                    name: widget.playerName,
                    hp: _playerHp,
                    max: _maxPlayer,
                  ),
                  _hpBar(
                    left: false,
                    name: widget.enemyName,
                    hp: _enemyHp,
                    max: _maxEnemy,
                  ),
                  Positioned(
                    left: 16,
                    bottom: 24,
                    child: Transform.translate(
                      offset: Offset(_playerTurn && !_finished ? lunge : 0, 0),
                      child: _shake(
                        !_hitOnPlayer ? 0 : t,
                        _finished && !_victory,
                        EidolonAvatar(
                          mood: _finished && _victory
                              ? EidolonMood.excited
                              : EidolonMood.focused,
                          size: 104,
                          genes: widget.playerGenes,
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    right: 16,
                    bottom: 24,
                    child: Transform.translate(
                      offset:
                          Offset(!_playerTurn && !_finished ? -lunge : 0, 0),
                      child: _shake(
                        _hitOnPlayer ? 0 : t,
                        _finished && _victory,
                        EidolonAvatar(
                          mood: EidolonMood.anxious,
                          size: 104,
                          genes: _enemyGenes,
                        ),
                      ),
                    ),
                  ),
                  if (!_finished) _damageNumber(w, t),
                  if (_finished) _resultBanner(w),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _shake(double t, bool active, Widget child) {
    if (!active && t == 0) return child;
    final dx = active ? math.sin(t * 40) * 3 : math.sin(t * 30) * 2 * (1 - t);
    return Transform.translate(offset: Offset(dx, 0), child: child);
  }

  Widget _damageNumber(double w, double t) {
    if (_hitAmount == 0) return const SizedBox.shrink();
    final left = _hitOnPlayer ? w * 0.18 : w * 0.66;
    return Positioned(
      left: left,
      bottom: 150 + t * 50,
      child: Opacity(
        opacity: (1 - t).clamp(0.0, 1.0),
        child: Text(
          '-$_hitAmount',
          style: const TextStyle(
            color: Color(0xFFFAC775),
            fontSize: 26,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }

  Widget _hpBar({
    required bool left,
    required String name,
    required double hp,
    required double max,
  }) {
    return Positioned(
      top: 16,
      left: left ? 16 : null,
      right: left ? null : 16,
      child: SizedBox(
        width: 150,
        child: Column(
          crossAxisAlignment:
              left ? CrossAxisAlignment.start : CrossAxisAlignment.end,
          children: [
            Text(
              name,
              style: const TextStyle(color: Color(0xFFF0F0FF), fontSize: 13),
            ),
            const SizedBox(height: 4),
            ClipRRect(
              borderRadius: BorderRadius.circular(5),
              child: TweenAnimationBuilder<double>(
                tween: Tween(begin: hp / max, end: hp / max),
                duration: const Duration(milliseconds: 300),
                builder: (context, v, _) => LinearProgressIndicator(
                  value: v.clamp(0.0, 1.0),
                  minHeight: 8,
                  backgroundColor: const Color(0xFF2A1822),
                  valueColor: AlwaysStoppedAnimation(
                    left ? const Color(0xFF4ADE80) : const Color(0xFFE2574A),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _resultBanner(double w) {
    return Positioned.fill(
      child: Center(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
          decoration: BoxDecoration(
            color: const Color(0xCC0E0F16),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color:
                  _victory ? const Color(0xFF4ADE80) : const Color(0xFFE2574A),
            ),
          ),
          child: Text(
            _victory ? '勝利！' : '敗北…',
            style: TextStyle(
              color:
                  _victory ? const Color(0xFF4ADE80) : const Color(0xFFE2574A),
              fontSize: 26,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }
}
