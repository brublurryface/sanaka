export type SamvitPresenceId =
  'sesha' | 'curious' | 'contemplative' | 'suspicious' | 'dotEye' | 'withBhu';

export interface SamvitPresence {
  readonly id: SamvitPresenceId;
  readonly imageSrc: string;
  readonly animatedImageSrc?: string;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly labelKey: string;
  readonly altKey: string;
  readonly messageKeys: readonly string[];
}

const SAMVIT_PRESENCES: Readonly<Record<SamvitPresenceId, SamvitPresence>> = {
  sesha: {
    id: 'sesha',
    imageSrc: '/images/samvit/presences/samvit-sesha-sleeping-still.webp',
    imageWidth: 1448,
    imageHeight: 1086,
    labelKey: 'samvit.presences.sesha.label',
    altKey: 'samvit.presences.sesha.alt',
    messageKeys: createMessageKeys('sesha'),
  },
  curious: {
    id: 'curious',
    imageSrc: '/images/samvit/presences/samvit-curious-still.png',
    imageWidth: 1122,
    imageHeight: 1402,
    labelKey: 'samvit.presences.curious.label',
    altKey: 'samvit.presences.curious.alt',
    messageKeys: createMessageKeys('curious'),
  },
  contemplative: {
    id: 'contemplative',
    imageSrc: '/images/samvit/presences/samvit-contemplative-still.png',
    animatedImageSrc: '/images/samvit/presences/samvit-contemplative-blink.webp',
    imageWidth: 1024,
    imageHeight: 1536,
    labelKey: 'samvit.presences.contemplative.label',
    altKey: 'samvit.presences.contemplative.alt',
    messageKeys: createMessageKeys('contemplative'),
  },
  suspicious: {
    id: 'suspicious',
    imageSrc: '/images/samvit/presences/samvit-abhaya-still.png',
    imageWidth: 1233,
    imageHeight: 1634,
    labelKey: 'samvit.presences.suspicious.label',
    altKey: 'samvit.presences.suspicious.alt',
    messageKeys: createMessageKeys('suspicious'),
  },
  dotEye: {
    id: 'dotEye',
    imageSrc: '/images/samvit/presences/samvit-dot-eye-still.png',
    animatedImageSrc: '/images/samvit/presences/samvit-dot-eye-ear-twitch.webp',
    imageWidth: 1024,
    imageHeight: 1536,
    labelKey: 'samvit.presences.dotEye.label',
    altKey: 'samvit.presences.dotEye.alt',
    messageKeys: createMessageKeys('dotEye'),
  },
  withBhu: {
    id: 'withBhu',
    imageSrc: '/images/samvit/presences/samvit-with-bhu-still.png',
    animatedImageSrc: '/images/samvit/presences/samvit-with-bhu-blink.webp',
    imageWidth: 1122,
    imageHeight: 1402,
    labelKey: 'samvit.presences.withBhu.label',
    altKey: 'samvit.presences.withBhu.alt',
    messageKeys: createMessageKeys('withBhu'),
  },
};

const PRESENCE_ODDS: readonly { readonly upperBound: number; readonly presence: SamvitPresence }[] =
  [
    { upperBound: 0.4, presence: SAMVIT_PRESENCES.sesha },
    { upperBound: 0.52, presence: SAMVIT_PRESENCES.curious },
    { upperBound: 0.64, presence: SAMVIT_PRESENCES.contemplative },
    { upperBound: 0.76, presence: SAMVIT_PRESENCES.suspicious },
    { upperBound: 0.88, presence: SAMVIT_PRESENCES.dotEye },
    { upperBound: 1, presence: SAMVIT_PRESENCES.withBhu },
  ];

/**
 * Mantém Śeṣa como presença principal sem impedir que as outras formas apareçam.
 * A função recebe o valor aleatório para que a regra permaneça isolada e testável.
 */
export function chooseSamvitPresence(roll: number): SamvitPresence {
  const normalizedRoll = normalizeRoll(roll);

  return (
    PRESENCE_ODDS.find(({ upperBound }) => normalizedRoll < upperBound)?.presence ??
    SAMVIT_PRESENCES.sesha
  );
}

export function chooseSamvitMessageKey(presence: SamvitPresence, roll: number): string {
  const messageIndex = Math.floor(normalizeRoll(roll) * presence.messageKeys.length);

  return presence.messageKeys[messageIndex];
}

function createMessageKeys(presenceId: SamvitPresenceId): readonly string[] {
  return Array.from(
    { length: 5 },
    (_, index) => `samvit.presences.${presenceId}.message${index + 1}`,
  );
}

function normalizeRoll(roll: number): number {
  if (!Number.isFinite(roll)) {
    return 0;
  }

  return Math.min(Math.max(roll, 0), 1 - Number.EPSILON);
}
