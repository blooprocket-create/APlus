import { describe, expect, it, vi } from 'vitest';
import { Mesh, Scene, Vector3 } from 'three';
import { buildEnemyMesh } from '../src/rendering/EnemyMeshBuilder';
import { disposeObject } from '../src/rendering/SceneResources';
import { VfxSystem } from '../src/rendering/VfxSystem';

describe('fiend collapse ownership', () => {
  it('keeps the model alive after combat removes its root and disposes it with the effect', () => {
    const scene = new Scene();
    const vfx = new VfxSystem(scene, {} as HTMLElement);
    const fiend = buildEnemyMesh('sentinel');
    fiend.root.position.set(5, 0, -3);
    fiend.bodyMesh.rotation.y = .73;
    scene.add(fiend.root);
    const body = new Vector3();
    fiend.bodyMesh.getWorldPosition(body);
    const mesh = fiend.bodyMesh.getObjectByProperty('isMesh', true) as Mesh;
    const disposeMesh = vi.spyOn(mesh.geometry, 'dispose');

    vfx.spawnFiendCollapse(fiend.bodyMesh, fiend.root.position, true);
    scene.remove(fiend.root);
    disposeObject(fiend.root);
    expect(fiend.bodyMesh.getWorldPosition(new Vector3())).toEqual(body);
    expect(disposeMesh).not.toHaveBeenCalled();

    vfx.clearAll();
    expect(disposeMesh).toHaveBeenCalledTimes(1);
    expect(scene.children).toHaveLength(0);
  });
});
