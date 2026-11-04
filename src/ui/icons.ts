const paths: Record<string, string> = {
  star: '<path d="M12 1l2.8 7.2L22 11l-7.2 2.8L12 21l-2.8-7.2L2 11l7.2-2.8z"/><path d="M20 2v4m-2-2h4"/>',
  spear: '<path d="M5 21L17 5m-4 1l7-4-1 8-2-5-4 1zM7 14l4 3"/>',
  tome: '<path d="M3 4h6l3 2 3-2h6v15h-6l-3 2-3-2H3zM12 6v15M6 8h3m-3 4h3m6-4h3m-3 4h3"/>',
  blade: '<path d="M6 18L19 3l1 8L9 20zM4 16l6 5M3 22l3-4"/>',
  arrow: '<path d="M4 12h16m-6-6l6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  shield: '<path d="M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6zM8 12l3 3 5-6"/>',
  flame: '<path d="M13 2c2 7-5 6-3 12 2-1 4-3 4-5 7 6 5 13-2 13C3 22 1 12 7 7c0 4 2 4 2 4s5-3 4-9z"/>',
  dash: '<path d="M3 6h10M1 12h8m-6 6h10M14 4l7 8-7 8M10 12h11"/>',
  burst: '<path d="M12 2l2 7 7-3-5 6 6 4-8-1-2 7-2-7-8 1 6-4-5-6 7 3z"/>',
  flask: '<path d="M9 2h6m-5 0v7l-5 9a3 3 0 003 4h8a3 3 0 003-4l-5-9V2M7 16h10"/>',
  bag: '<path d="M5 7h14l2 14H3zM8 7V5a4 4 0 018 0v2M9 12h6"/>',
  sound: '<path d="M3 9h4l5-5v16l-5-5H3zM16 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',
  mute: '<path d="M3 9h4l5-5v16l-5-5H3zM16 9l6 6m0-6l-6 6"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  map: '<path d="M3 5l6-3 6 3 6-3v17l-6 3-6-3-6 3zM9 2v17M15 5v17"/>',
  diamond: '<path d="M12 2l9 10-9 10-9-10zM3 12h18M12 2v20"/>',
};

export function icon(name: string, size = 22): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.star}</svg>`;
}

export const CLASS_ICONS = { warrior: 'spear', mage: 'tome', assassin: 'blade' } as const;
