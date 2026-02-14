import type { ActivityOption } from './types';

const MIN_DISTANCE_PERCENT = 8;
const MAX_JITTER_ATTEMPTS = 10;
const JITTER_BASE_STEP_PERCENT = 2.4;
const JITTER_RADIUS_INCREMENT_PERCENT = 1.3;

export interface HotspotValidationWarning {
    code: 'bounds' | 'overlap';
    message: string;
}

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt((dx * dx) + (dy * dy));
};

const stableHash = (value: string) => {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = ((hash * 31) + value.charCodeAt(index)) % 1_000_003;
    }
    return hash;
};

const clampPoint = (point: { x: number; y: number }) => ({
    x: Math.max(0, Math.min(100, point.x)),
    y: Math.max(0, Math.min(100, point.y))
});

const jitterPoint = (
    point: { x: number; y: number },
    seed: string,
    attempt: number
) => {
    const hash = stableHash(seed);
    const angleDegrees = (hash % 360) + (attempt * 43);
    const angle = (angleDegrees * Math.PI) / 180;
    const radius = JITTER_BASE_STEP_PERCENT + ((attempt - 1) * JITTER_RADIUS_INCREMENT_PERCENT);
    return clampPoint({
        x: point.x + (Math.cos(angle) * radius),
        y: point.y + (Math.sin(angle) * radius)
    });
};

const isCandidateClear = (
    candidate: { x: number; y: number },
    options: ActivityOption[],
    ignoreIndex: number
) => {
    for (let index = 0; index < options.length; index += 1) {
        if (index === ignoreIndex) continue;
        const hotspot = options[index].hotspot;
        if (!hotspot) continue;
        if (distance(candidate, hotspot) < MIN_DISTANCE_PERCENT) {
            return false;
        }
    }
    return true;
};

export const validateAndNormalizeHotspots = (
    activityId: string,
    options: ActivityOption[]
): { options: ActivityOption[]; warnings: HotspotValidationWarning[] } => {
    const warnings: HotspotValidationWarning[] = [];

    const normalized = options.map((option) => {
        if (!option.hotspot) return option;
        const clampedX = Math.max(0, Math.min(100, option.hotspot.x));
        const clampedY = Math.max(0, Math.min(100, option.hotspot.y));
        if (clampedX !== option.hotspot.x || clampedY !== option.hotspot.y) {
            warnings.push({
                code: 'bounds',
                message: `Activity ${activityId}: hotspot "${option.id}" clamped to bounds (${clampedX.toFixed(1)}, ${clampedY.toFixed(1)}).`
            });
        }

        return {
            ...option,
            hotspot: {
                ...option.hotspot,
                x: clampedX,
                y: clampedY
            }
        };
    });

    for (let i = 0; i < normalized.length; i += 1) {
        const a = normalized[i];
        if (!a.hotspot) continue;

        for (let j = i + 1; j < normalized.length; j += 1) {
            const b = normalized[j];
            if (!b.hotspot) continue;

            let currentGap = distance(a.hotspot, b.hotspot);
            if (currentGap >= MIN_DISTANCE_PERCENT) continue;

            const originalHotspot = { ...b.hotspot };
            let healed = false;

            for (let attempt = 1; attempt <= MAX_JITTER_ATTEMPTS; attempt += 1) {
                const candidate = jitterPoint(
                    originalHotspot,
                    `${activityId}:${a.id}:${b.id}:${attempt}`,
                    attempt
                );
                if (!isCandidateClear(candidate, normalized, j)) {
                    continue;
                }

                normalized[j] = {
                    ...normalized[j],
                    hotspot: {
                        ...normalized[j].hotspot!,
                        x: candidate.x,
                        y: candidate.y
                    }
                };
                healed = true;
                currentGap = distance(a.hotspot, normalized[j].hotspot!);
                break;
            }

            if (currentGap < MIN_DISTANCE_PERCENT) {
                warnings.push({
                    code: 'overlap',
                    message: `Activity ${activityId}: hotspots "${a.id}" and "${b.id}" overlap (${currentGap.toFixed(1)}%) after auto-heal attempts.`
                });
            } else {
                warnings.push({
                    code: 'overlap',
                    message: healed
                        ? `Activity ${activityId}: hotspots "${a.id}" and "${b.id}" were auto-healed (${currentGap.toFixed(1)}% gap).`
                        : `Activity ${activityId}: hotspots "${a.id}" and "${b.id}" overlap issue resolved.`
                });
            }
        }
    }

    return { options: normalized, warnings };
};
