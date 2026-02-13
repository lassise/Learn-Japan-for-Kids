/**
 * Progressive Leveling System
 *
 * Level N → N+1 costs N × 100 XP:
 *   Level 1→2: 100 XP
 *   Level 2→3: 200 XP
 *   Level 3→4: 300 XP
 *   ...
 *
 * Cumulative XP to reach Level L = L×(L-1)×50
 *   Level 1: 0, Level 2: 100, Level 3: 300, Level 4: 600, Level 5: 1000, ...
 */

/** Cumulative XP required to reach a given level */
export function getXpForLevel(level: number): number {
    return level * (level - 1) * 50;
}

/** Derive current level from total XP */
export function getLevelFromXP(totalXP: number): number {
    // Solve: level*(level-1)*50 <= totalXP
    // level^2 - level - totalXP/50 <= 0
    // level <= (1 + sqrt(1 + 4*totalXP/50)) / 2
    const level = Math.floor((1 + Math.sqrt(1 + (4 * totalXP) / 50)) / 2);
    return Math.max(1, level);
}

/** XP earned within the current level (progress toward next) */
export function getXpProgressInLevel(totalXP: number): number {
    const level = getLevelFromXP(totalXP);
    return totalXP - getXpForLevel(level);
}

/** XP needed to go from current level to the next */
export function getXpNeededForNextLevel(totalXP: number): number {
    const level = getLevelFromXP(totalXP);
    return level * 100; // Level N requires N*100 XP to advance
}

/** Progress percentage within current level (0-100) */
export function getLevelProgressPercent(totalXP: number): number {
    const progress = getXpProgressInLevel(totalXP);
    const needed = getXpNeededForNextLevel(totalXP);
    return Math.min(100, (progress / needed) * 100);
}
