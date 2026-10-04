export type MayaPresenceId = 'sesha' | 'curious' | 'contemplative' | 'suspicious' | 'dotEye';

export interface MayaPresence {
  readonly id: MayaPresenceId;
  readonly motionImageSrc: string;
  readonly stillImageSrc: string;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly labelKey: string;
  readonly altKey: string;
  readonly messageKeys: readonly string[];
}

const MAYA_PRESENCES: Readonly<Record<MayaPresenceId, MayaPresence>> = {
  sesha: {
    id: 'sesha',
    motionImageSrc: '/images/maya/presences/maya-sesha-sleeping-motion.webp',
    stillImageSrc: '/images/maya/presences/maya-sesha-sleeping-still.webp',
    imageWidth: 1456,
    imageHeight: 1094,
    labelKey: 'maya.presences.sesha.label',
    altKey: 'maya.presences.sesha.alt',
    messageKeys: createMessageKeys('sesha'),
  },
  curious: {
    id: 'curious',
    motionImageSrc: '/images/maya/presences/maya-curious-motion.webp',
    stillImageSrc: '/images/maya/presences/maya-curious-still.webp',
    imageWidth: 1130,
    imageHeight: 1410,
    labelKey: 'maya.presences.curious.label',
    altKey: 'maya.presences.curious.alt',
    messageKeys: createMessageKeys('curious'),
  },
  contemplative: {
    id: 'contemplative',
    motionImageSrc: '/images/maya/presences/maya-contemplative-motion.webp',
    stillImageSrc: '/images/maya/presences/maya-contemplative-still.webp',
    imageWidth: 1130,
    imageHeight: 1410,
    labelKey: 'maya.presences.contemplative.label',
    altKey: 'maya.presences.contemplative.alt',
    messageKeys: createMessageKeys('contemplative'),
  },
  suspicious: {
    id: 'suspicious',
    motionImageSrc: '/images/maya/presences/maya-suspicious-motion.webp',
    stillImageSrc: '/images/maya/presences/maya-suspicious-still.webp',
    imageWidth: 1130,
    imageHeight: 1410,
    labelKey: 'maya.presences.suspicious.label',
    altKey: 'maya.presences.suspicious.alt',
    messageKeys: createMessageKeys('suspicious'),
  },
  dotEye: {
    id: 'dotEye',
    motionImageSrc: '/images/maya/presences/maya-dot-eye-motion.webp',
    stillImageSrc: '/images/maya/presences/maya-dot-eye-still.webp',
    imageWidth: 1167,
    imageHeight: 1364,
    labelKey: 'maya.presences.dotEye.label',
    altKey: 'maya.presences.dotEye.alt',
    messageKeys: createMessageKeys('dotEye'),
  },
};

const PRESENCE_ODDS: readonly { readonly upperBound: number; readonly presence: MayaPresence }[] = [
  { upperBound: 0.4, presence: MAYA_PRESENCES.sesha },
  { upperBound: 0.55, presence: MAYA_PRESENCES.curious },
  { upperBound: 0.7, presence: MAYA_PRESENCES.contemplative },
  { upperBound: 0.85, presence: MAYA_PRESENCES.suspicious },
  { upperBound: 1, presence: MAYA_PRESENCES.dotEye },
];

/**
 * Mantém Śeṣa como presença principal sem impedir que as outras formas apareçam.
 * A função recebe o valor aleatório para que a regra permaneça isolada e testável.
 */
export function chooseMayaPresence(roll: number): MayaPresence {
  const normalizedRoll = normalizeRoll(roll);

  return (
    PRESENCE_ODDS.find(({ upperBound }) => normalizedRoll < upperBound)?.presence ??
    MAYA_PRESENCES.sesha
  );
}

export function chooseMayaMessageKey(presence: MayaPresence, roll: number): string {
  const messageIndex = Math.floor(normalizeRoll(roll) * presence.messageKeys.length);

  return presence.messageKeys[messageIndex];
}

function createMessageKeys(presenceId: MayaPresenceId): readonly string[] {
  return Array.from(
    { length: 5 },
    (_, index) => `maya.presences.${presenceId}.message${index + 1}`,
  );
}

function normalizeRoll(roll: number): number {
  if (!Number.isFinite(roll)) {
    return 0;
  }

  return Math.min(Math.max(roll, 0), 1 - Number.EPSILON);
}
