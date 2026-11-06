import * as THREE from 'three';

export function buildKunai(steel: THREE.MeshBasicMaterial, wake: THREE.MeshBasicMaterial): THREE.Group {
  const shape = new THREE.BufferGeometry();
  shape.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, .49, -.13, 0, .025, 0, .045, .071, 0, 0, .49, 0, .045, .071, .13, 0, .025,
    -.13, 0, .025, -.047, 0, -.16, 0, .045, .071, .13, 0, .025, 0, .045, .071, .047, 0, -.16,
    -.047, 0, -.16, .047, 0, -.16, 0, .045, .071,
  ], 3));
  const accent = steel.color.clone().lerp(new THREE.Color(0xffeedf), .43);
  const ink = steel.color.clone().lerp(new THREE.Color(0x281330), .83);
  const tint = new THREE.Color();
  const colors: number[] = [];
  for (const [facet, tone] of [.69, .29, .43, .12, .16].entries()) {
    for (let vertex = 0; vertex < 3; vertex++) {
      tint.copy(ink).lerp(accent, tone + (facet < 2 && vertex === 0 ? .22 : 0));
      colors.push(tint.r, tint.g, tint.b);
    }
  }
  shape.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  steel.color.setHex(0xffffff);
  steel.vertexColors = true;
  steel.side = THREE.DoubleSide;

  const ribbon = new THREE.BufferGeometry();
  const points: number[] = [], opacity: number[] = [], indices: number[] = [];
  for (const [i, [z, width, alpha]] of [[.045, .084, .87], [-.23, .106, .68],
    [-.51, .074, .39], [-.88, .025, .13], [-1.13, .002, 0]].entries()) {
    const curve = (z - .04) ** 2 * .075;
    points.push(-width + curve, -.029 - width * .36, z, width + curve, -.029 + width * .36, z);
    opacity.push(1, .57, .79, alpha, 1, .90, .95, alpha * .78);
    if (i > 0) {
      const j = (i - 1) * 2;
      indices.push(j, j + 2, j + 1, j + 1, j + 2, j + 3);
    }
  }
  ribbon.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  ribbon.setAttribute('color', new THREE.Float32BufferAttribute(opacity, 4));
  ribbon.setIndex(indices);
  wake.side = THREE.DoubleSide;
  wake.vertexColors = true;
  wake.depthWrite = false;
  wake.blending = THREE.NormalBlending;
  const group = new THREE.Group();
  group.add(new THREE.Mesh(shape, steel), new THREE.Mesh(ribbon, wake));
  return group;
}

export function buildShadowChakram(ink: THREE.MeshBasicMaterial, light: THREE.MeshBasicMaterial): THREE.Group {
  const shape = new THREE.Shape();
  const edge: number[] = [];
  const silhouette = [[.29, -.92], [.34, -.66], [.53, -.46], [.72, -.17], [.86, .31],
    [.68, .19], [.48, .09], [.34, .36], [.30, .78]];
  const blade = [[.40, -.44], [.68, -.15], [.86, .31], [.62, .10], [.42, -.23]];
  for (let arm = 0; arm < 3; arm++) {
    const rotation = arm * Math.PI * 2 / 3;
    const point = ([radius, angle]: number[]) =>
      [Math.cos(rotation + angle) * radius, Math.sin(rotation + angle) * radius] as const;
    for (const [i, sample] of silhouette.entries()) {
      const [x, y] = point(sample);
      if (arm === 0 && i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    for (const [a, b, c] of [[0, 1, 4], [1, 2, 3], [1, 3, 4]]) {
      for (const index of [a, b, c]) {
        const [x, z] = point(blade[index]);
        edge.push(x, .012, -z);
      }
    }
  }
  shape.closePath();
  const center = new THREE.Path();
  center.absarc(0, 0, .132, 0, Math.PI * 2, true);
  shape.holes.push(center);
  const steel = new THREE.ShapeGeometry(shape, 12);
  steel.rotateX(-Math.PI / 2);
  const bevel = new THREE.BufferGeometry();
  bevel.setAttribute('position', new THREE.Float32BufferAttribute(edge, 3));
  ink.color.lerp(new THREE.Color(0x271130), .64);
  ink.side = light.side = THREE.DoubleSide;
  light.blending = THREE.NormalBlending;
  light.depthWrite = false;
  const group = new THREE.Group();
  group.rotation.z = -.17;
  group.add(new THREE.Mesh(steel, ink), new THREE.Mesh(bevel, light));
  return group;
}
