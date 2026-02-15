export function replaceImageSize(url: string, size: number = 400): string {
  return url?.replace('{size}', String(size)) || '';
}
