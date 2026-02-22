export function replaceImageSize(url?: string, size: number = 400): string {
  if (!url) return '';
  return url?.replace('{size}', String(size)) || '';
}
