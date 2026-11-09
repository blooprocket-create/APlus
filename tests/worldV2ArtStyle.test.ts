import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { addOriginalWorldLighting, PAINTED_WATER_PALETTE, paintedPalette } from '../src/rendering/PaintedWorldStyle';
import { createOceanPreview } from '../src/world-v2/WorldOceanPreview';
import { createSceneryMeshes } from '../src/world-v2/WorldSceneryRender';
import { buildGeographyTerrainCell } from '../src/world-v2/WorldTerrain';
import { stageAtlas, stageGeography } from '../src/world-v2/WorldGeographyStage';

describe('World V2 native Astral Chronicles art system', () => {
  it('shares the original Hearthmere paper-wash material, not a new basic shader', () => {
    const focus = { value: new THREE.Vector4() };
    const origin = { value: new THREE.Vector3(1200, 0, -700) };
    const material = paintedPalette(focus, { worldOrigin: origin });
    expect(material).toBeInstanceOf(THREE.MeshLambertMaterial);
    expect(material.vertexColors).toBe(true);
    expect(String(material.onBeforeCompile)).toContain('paperHash');
    expect(String(material.onBeforeCompile)).toContain('addSceneryCutaway');
    expect(origin.value.x).toBe(1200);
    material.dispose();
  });
  it('preserves the original game sun, ambient and soft-shadow configuration', () => {
    const scene = new THREE.Scene();
    const { ambient, sun } = addOriginalWorldLighting(scene, { touchUI: true });
    expect(ambient.color.getHex()).toBe(0xc2d5dc);
    expect(ambient.groundColor.getHex()).toBe(0x17292e);
    expect(sun.color.getHex()).toBe(0xffe2b1);
    expect(sun.castShadow).toBe(true);
    expect(sun.shadow.mapSize.x).toBe(512);
    expect(scene.fog).toBeInstanceOf(THREE.FogExp2);
    const desktop = addOriginalWorldLighting(new THREE.Scene(), { touchUI: false });
    expect(desktop.sun.shadow.mapSize.x).toBe(1024);
  });
  it('uses the existing Hearthmere river palette for the ocean', () => {
    const ocean = createOceanPreview();
    const uniforms = ocean.mesh.material.uniforms;
    expect(uniforms.deep.value.getHex()).toBe(PAINTED_WATER_PALETTE.deep);
    expect(uniforms.channel.value.getHex()).toBe(PAINTED_WATER_PALETTE.channel);
    expect(uniforms.shallows.value.getHex()).toBe(PAINTED_WATER_PALETTE.shallows);
    expect(uniforms.glint.value.getHex()).toBe(PAINTED_WATER_PALETTE.glint);
    expect(ocean.mesh.material.fragmentShader).toContain('strokes');
    ocean.update(1500, -900, 10, 14, 2);
    expect(uniforms.uWorldCenter.value.x).toBe(1500);
    expect(uniforms.uWorldCenter.value.y).toBe(-900);
    ocean.mesh.geometry.dispose(); ocean.mesh.material.dispose();
  });
  it('uses batched native loft silhouettes and the original painted meadow blades', () => {
    const cell = buildGeographyTerrainCell(stageGeography, { x: 0, z: 0 });
    const origin = { value: new THREE.Vector3() };
    const scenery = createSceneryMeshes(cell, stageAtlas.worldSeed, stageAtlas.anchors, origin);
    expect(scenery.count).toBeGreaterThan(5);
    expect(scenery.group.children.length).toBeGreaterThan(1);
    const instanced = scenery.group.children.filter(mesh => mesh instanceof THREE.InstancedMesh) as THREE.InstancedMesh[];
    expect(instanced.length).toBeGreaterThanOrEqual(2);
    const paintedTree = instanced.find(mesh => mesh.name.includes('original Hearthmere art grammar'));
    expect(paintedTree).toBeDefined();
    expect(paintedTree!.material).toBeInstanceOf(THREE.MeshLambertMaterial);
    expect(paintedTree!.geometry.getAttribute('color')).toBeDefined();
    expect(paintedTree!.geometry.getAttribute('position').count).toBeGreaterThan(120);
    expect(instanced.some(mesh => mesh.name === 'Windblown meadow grass')).toBe(true);
    const disposed = new Set<THREE.Material>(), geometries = new Set<THREE.BufferGeometry>();
    scenery.group.traverse(child => {
      if (child instanceof THREE.InstancedMesh) child.dispose();
      if (child instanceof THREE.Mesh) {
        geometries.add(child.geometry);
        for (const material of Array.isArray(child.material) ? child.material : [child.material]) disposed.add(material);
      }
    });
    geometries.forEach(geometry => geometry.dispose());
    disposed.forEach(material => material.dispose());
  });
});
