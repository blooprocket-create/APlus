import {spawnSync} from 'node:child_process';
for(const script of ['build_observatory.py','build_celestia.py','build_keeper.py','build_ability.py','build_reconstructed_keeper.py','export_authored_hero.py','build_reconstructed_tree.py','foliage_from_sculpt.py','build_reconstructed_gate.py','build_reconstructed_cliff.py']){
 const result=spawnSync(process.env.BLENDER_BIN||'blender',['--background','--python-exit-code','1','--python','tools/atelier/'+script],{stdio:'inherit'});
 if(result.status!==0)process.exit(result.status||1);
}
