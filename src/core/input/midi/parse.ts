export type MidiMessage =
  | { type: 'noteOn'; channel: number; note: number; velocity: number }
  | { type: 'noteOff'; channel: number; note: number; velocity: number }
  | { type: 'cc'; channel: number; controller: number; value: number };

/**
 * Parses channel voice messages. Note-on with velocity 0 is a note-off. System messages
 * (clock 0xF8, active sensing 0xFE, sysex...) are ignored. Channels are 1-16.
 */
export function parseMidiMessage(data: ArrayLike<number>): MidiMessage | null {
  if (!data || data.length < 1) return null;
  const status = data[0];
  if (status >= 0xf0) return null; // system common / realtime
  const type = status & 0xf0;
  const channel = (status & 0x0f) + 1;
  if (data.length < 3 && type !== 0xc0 && type !== 0xd0) return null;
  switch (type) {
    case 0x90:
      return data[2] === 0 ? { type: 'noteOff', channel, note: data[1], velocity: 0 } : { type: 'noteOn', channel, note: data[1], velocity: data[2] };
    case 0x80:
      return { type: 'noteOff', channel, note: data[1], velocity: data[2] };
    case 0xb0:
      return { type: 'cc', channel, controller: data[1], value: data[2] };
    default:
      return null;
  }
}

export function formatBytes(data: ArrayLike<number>): string {
  return Array.from(data, (b) => b.toString(16).padStart(2, '0')).join(' ');
}
