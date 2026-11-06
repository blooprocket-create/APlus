import * as THREE from 'three';

export function buildLobbyMote() {
  const paint = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { time: { value: 0 } },
    vertexShader: `
      varying vec2 mote;
      void main() {
        mote = uv * 2.0 - 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 mote;
      uniform float time;
      void main() {
        float angle = time * .73;
        vec2 p = mat2(cos(angle), sin(angle), -sin(angle), cos(angle)) * mote;
        float reach = .41 + sin(time * 2.1) * .055;
        float cross = min(abs(p.x), abs(p.y)) * 3.0 + max(abs(p.x), abs(p.y));
        float star = 1.0 - smoothstep(reach - .026, reach + .018, cross);
        float halo = 1.0 - smoothstep(.12, .76, length(mote));
        vec3 tint = mix(vec3(.07,.51,.74), vec3(.70,.98,.99), star);
        gl_FragColor = vec4(tint, max(star, halo * halo * .24));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(.39, .39), paint);
  mesh.visible = false;
  return mesh;
}
