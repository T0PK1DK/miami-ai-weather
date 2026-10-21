export function radarTileUrl(host: string, path: string, z: number, x: number, y: number): string {
  const base = host.replace(/\/$/, "");
  return `${base}${path}/256/${z}/${x}/${y}/2/1_1.png`;
}

export function clampFrame(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}
