import {spawnSync} from 'node:child_process';
for(const script of ['build_observatory.py','build_celestia.py','build_keeper.py']){
 const result=spawnSync(process.env.BLENDER_BIN||'blender',['--background','--python-exit-code','1','--python','tools/atelier/'+script],{stdio:'inherit'});
 if(result.status!==0)process.exit(result.status||1);
}
