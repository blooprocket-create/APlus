import './ui/atelier.css';
import { GameEngine } from './game/GameEngine';
import { PersistenceManager } from './persistence/PersistenceManager';
import { InMemoryStorageAdapter } from './persistence/StorageAdapter';

async function main(){
  document.querySelector<HTMLElement>('#atelier-ui')!.dataset.composition=new URLSearchParams(location.search).get('composition')??'close';
  const p = new PersistenceManager(new InMemoryStorageAdapter());await p.init();
  const hero=await p.createCharacter({accountId:'atelier',slotIndex:0,name:'Celestia',classId:'mage'});
  let activeEngine:GameEngine|null=null;
  const syncCaption=()=>{if(!activeEngine)return;const d=activeEngine.atelierDiagnostics() as {view:number;castAge:number;hp:number;maxHp:number;cooldown:number;keeper:{name:string;hp:number;maxHp:number}|null;animation:{attackComboStep:number;isMoving:boolean}};
    const ui=document.querySelector<HTMLElement>('#atelier-ui')!;ui.dataset.view=String(d.view);
    ui.classList.toggle('combat',d.view===2||d.view===4||(d.view===0&&(d.animation.isMoving||d.animation.attackComboStep>0||d.castAge<2.65)));
    const health=document.querySelector<HTMLMeterElement>('#hero-health')!;health.max=d.maxHp||1;health.value=Math.max(0,d.hp||0);health.setAttribute('aria-valuetext',`${Math.ceil(health.value)} of ${health.max} health`);
    const keeper=document.querySelector<HTMLMeterElement>('#keeper-health')!;keeper.max=d.keeper?.maxHp||1600;keeper.value=Math.max(0,d.keeper?.hp||0);
    document.querySelector('#keeper-state')!.textContent=d.keeper?'THE ORRERY KEEPER':'THE GARDEN REMEMBERS';
    const cast=document.querySelector<HTMLButtonElement>('#cast')!;cast.disabled=d.cooldown>0||d.hp<=0;cast.textContent=d.cooldown>0?`Astral bloom · ${d.cooldown.toFixed(1)}s`:'Q · Astral bloom';
  };
  const engine=new GameEngine(document.querySelector('canvas')!,document.querySelector('#damage-layer')!,p,{
    onHudUpdate:syncCaption,onBannerNotification:()=>{},onUltimateCutIn:()=>{},onLootObtained:()=>{},
    onDefeated:()=>{
      const panel=document.createElement('div');panel.id='loading';panel.setAttribute('role','status');
      panel.innerHTML='<p>The garden remembers.</p><button>Return to the observatory</button>';
      panel.querySelector('button')!.addEventListener('click',()=>location.reload());
      document.querySelector('#atelier-ui')!.classList.remove('hidden');
      document.querySelector('#atelier-ui')!.appendChild(panel);
    },
    onZoneCleared:()=>{},onCharacterSaved:()=>{},onTriggerCutscene:()=>{},
  });
  activeEngine=engine;
  await engine.startObservatoryAtelier(hero,new URLSearchParams(location.search).has('baseline'));
  document.querySelector('#loading')!.remove();
  document.querySelector('#restart')!.addEventListener('click',()=>location.reload());
  document.querySelector('#cast')!.addEventListener('click',()=>{engine.atelierSkill();syncCaption();});
  document.querySelector('#camera')!.addEventListener('click',()=>{engine.atelierView();syncCaption();});
  const clean=()=>document.querySelector('#atelier-ui')!.classList.toggle('hidden');
  document.querySelector('#clean')!.addEventListener('click',clean);
  addEventListener('keydown',e=>{if(e.code==='KeyC'){engine.atelierView();syncCaption();}if(e.code==='KeyP')clean();});
  const present=()=>{syncCaption();requestAnimationFrame(present);};requestAnimationFrame(present);
  // Review-only capture pause uses the existing pause owner; no separate animation clock.
  Object.assign(window,{__atelier:{snapshot:()=>engine.atelierDiagnostics(),inspect:()=>engine.atelierInspectArt(),freeze:(paused:boolean)=>engine.setPaused('atelier-review',paused)}});
}
void main().catch(e=>{document.querySelector('#loading')!.textContent='The garden could not load. '+String(e);console.error(e);});
