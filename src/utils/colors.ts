const DEVICE_COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#be123c",
  "#4f46e5",
  "#65a30d",
  "#0f766e",
];

export function colorForDevice(deviceId: string): string {
  let hash = 0;
  for (let index = 0; index < deviceId.length; index += 1) {
    hash = (hash << 5) - hash + deviceId.charCodeAt(index);
    hash |= 0;
  }

  return DEVICE_COLORS[Math.abs(hash) % DEVICE_COLORS.length];
}
