import * as THREE from 'three';

/** In-world signs keep navigation readable without opening an overlay. */
export function worldLabel(text: string, color = '#ead9ac'): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 768; canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#09171ee8'; ctx.fillRect(0, 0, 768, 96);
  ctx.strokeStyle = '#bba675'; ctx.strokeRect(2, 2, 764, 92);
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '30px Georgia, serif'; ctx.fillText(text, 384, 48, 730);
  const texture = new THREE.CanvasTexture(canvas);
  texture.userData.ownedByScene = true;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
  sprite.scale.set(8.5, 1.06, 1); sprite.position.y = 4.2; sprite.renderOrder = 5;
  return sprite;
}
