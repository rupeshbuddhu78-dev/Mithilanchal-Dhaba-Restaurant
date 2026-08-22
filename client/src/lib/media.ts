export const DEFAULT_IMAGE_FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%23f2dfc8'/%3E%3Cstop offset='1' stop-color='%23dba36f'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='800' height='600' fill='url(%23g)'/%3E%3Ccircle cx='640' cy='135' r='95' fill='%23fff8ef' fill-opacity='.45'/%3E%3Cpath d='M160 410c95-150 230-170 360-35 55 56 108 70 170 37v188H110z' fill='%23a94d32' fill-opacity='.2'/%3E%3C/svg%3E";

export function safeImageUrl(url: string | null | undefined) {
  return url && !url.startsWith("/manus-storage/") ? url : DEFAULT_IMAGE_FALLBACK;
}
