import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radii, spacing } from '@/constants/theme';
import { ChatMessage } from '@/models/types';

const BUBBLE_MINE = colors.primarySoft;
const BUBBLE_THEIRS = colors.card;

type Delivery = 'sent' | 'delivered' | 'read';

/** Double check marks, WhatsApp style. */
function Ticks({ state }: { state: Delivery }) {
  const tint = state === 'read' ? colors.info : colors.textMuted;
  if (state === 'sent') {
    return <Ionicons name="checkmark" size={13} color={tint} />;
  }
  return (
    <View style={styles.ticks}>
      <Ionicons name="checkmark" size={13} color={tint} />
      <Ionicons name="checkmark" size={13} color={tint} style={styles.tickOverlay} />
    </View>
  );
}

export function ChatBubble({
  message,
  isPatient,
  showTail = true,
  flat = false,
}: {
  message: ChatMessage;
  isPatient: boolean;
  showTail?: boolean;
  /** Grouped with the next message from the same sender: tighter spacing. */
  flat?: boolean;
}) {
  const [delivery, setDelivery] = useState<Delivery>('sent');

  const mine = isPatient ? message.sender === 'patient' : message.sender === 'doctor';

  // Simulated progression sent → delivered → read. There is no realtime
  // receipt channel yet; this mirrors WhatsApp's pacing for the demo feel.
  useEffect(() => {
    if (!mine) return;
    const t1 = setTimeout(() => setDelivery('delivered'), 500);
    const t2 = setTimeout(() => setDelivery('read'), 1600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [mine]);

  if (message.kind === 'system' || message.sender === 'system') {
    return (
      <View style={styles.systemWrap}>
        <Text style={styles.systemText}>{message.text} • {message.time}</Text>
      </View>
    );
  }

  if (message.kind === 'audio') {
    return (
      <View style={[styles.wrap, flat && styles.wrapFlat, mine ? styles.wrapMine : styles.wrapTheirs]}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <View style={styles.fileRow}>
            <View style={[styles.fileIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="play" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mediaTitle} numberOfLines={1}>Message vocal</Text>
              <Text style={styles.mediaSub}>{message.audioDuration ?? 'Lecture impossible'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.timeInline}>{message.time}</Text>
          </View>
        </View>
      </View>
    );
  }

  if (message.kind === 'prescription') {
    return (
      <View style={[styles.wrap, flat && styles.wrapFlat, mine ? styles.wrapMine : styles.wrapTheirs]}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <View style={styles.fileRow}>
            <View style={styles.fileIcon}>
              <Ionicons name="medkit" size={20} color={colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mediaTitle} numberOfLines={1}>Ordonnance partagée</Text>
              <Text style={styles.mediaSub}>Toucher pour consulter</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.timeInline}>{message.time}</Text>
          </View>
        </View>
      </View>
    );
  }

  const body = message.text ?? 'Pièce jointe indisponible.';

  return (
    <View style={[styles.wrap, flat && styles.wrapFlat, mine ? styles.wrapMine : styles.wrapTheirs]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        {showTail && (
          <View style={[styles.tail, { backgroundColor: mine ? BUBBLE_MINE : BUBBLE_THEIRS }, mine ? styles.tailMine : styles.tailTheirs]} />
        )}
        <Text style={styles.text}>{body}</Text>
        <View style={styles.metaRow}>
          <Text style={[styles.timeInline, mine && styles.timeInlineMine]}>{message.time}</Text>
          {mine && <Ticks state={delivery} />}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    maxWidth: '80%',
    marginBottom: spacing.m,
  },
  wrapMine: { alignSelf: 'flex-end' },
  wrapTheirs: { alignSelf: 'flex-start' },
  wrapFlat: { marginBottom: 4 },
  bubble: {
    borderRadius: radii.l,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
  },
  bubbleMine: {
    backgroundColor: BUBBLE_MINE,
    borderTopRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: BUBBLE_THEIRS,
    borderTopLeftRadius: 4,
  },
  // Rotated square sharing the bubble color: its outer half pokes past the
  // corner as a seamless WhatsApp-style tail, the inner half blends in.
  tail: {
    position: 'absolute',
    top: -5,
    width: 12,
    height: 12,
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
  tailMine: { right: -4 },
  tailTheirs: { left: -4 },
  text: {
    fontSize: font.size.base,
    color: colors.text,
    lineHeight: 21,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 3,
    marginTop: 2,
    marginLeft: spacing.m,
  },
  timeInline: {
    fontSize: font.size.xs - 1,
    color: colors.textFaint,
    fontVariant: ['tabular-nums'],
  },
  timeInlineMine: { color: colors.textMuted },
  ticks: {
    flexDirection: 'row',
  },
  tickOverlay: { marginLeft: -7 },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    width: 230,
    backgroundColor: colors.divider,
    borderRadius: radii.m,
    padding: 10,
  },
  fileIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaTitle: {
    fontSize: font.size.sm,
    fontWeight: '600',
    color: colors.text,
  },
  mediaSub: {
    fontSize: font.size.xs,
    color: colors.textFaint,
    marginTop: 1,
  },
  systemWrap: {
    alignSelf: 'center',
    backgroundColor: colors.divider,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginVertical: spacing.s,
  },
  systemText: {
    fontSize: font.size.xs,
    color: colors.textMuted,
  },
});
