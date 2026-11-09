import './ui/atelier.css';
import { GameEngine } from './game/GameEngine';
import { PersistenceManager } from './persistence/PersistenceManager';
import { InMemoryStorageAdapter } from './persistence/StorageAdapter';

async function main(){
  const p = new PersistenceManager(new InMemoryStorageAdapter());await p.init();
  const hero=await p.createCharacter({accountId:'atelier',slotIndex:0,name:'Celestia',classId:'mage'});
  const engine=new GameEngine(document.querySelector('canvas')!,document.querySelector('#damage-layer')!,p,{
    onHudUpdate:()=>{},onBannerNotification:()=>{},onUltimateCutIn:()=>{},onLootObtained:()=>{},
    onDefeated:()=>{
      const panel=document.createElement('div');panel.id='loading';panel.setAttribute('role','status');
      panel.innerHTML='<p>The garden remembers.</p><button>Return to the observatory</button>';
      panel.querySelector('button')!.addEventListener('click',()=>location.reload());
      document.querySelector('#atelier-ui')!.classList.remove('hidden');
      document.querySelector('#atelier-ui')!.appendChild(panel);
    },
    onZoneCleared:()=>{},onCharacterSaved:()=>{},onTriggerCutscene:()=>{},
  });
  await engine.startObservatoryAtelier(hero,new URLSearchParams(location.search).has('baseline'));
  document.querySelector('#loading')!.remove();
  document.querySelector('#cast')!.addEventListener('click',()=>engine.atelierSkill());
  document.querySelector('#camera')!.addEventListener('click',()=>engine.atelierView());
  const clean=()=>document.querySelector('#atelier-ui')!.classList.toggle('hidden');
  document.querySelector('#clean')!.addEventListener('click',clean);
  addEventListener('keydown',e=>{if(e.code==='KeyC')engine.atelierView();if(e.code==='KeyP')clean();});
  // Review-only capture pause uses the existing pause owner; no separate animation clock.
  Object.assign(window,{__atelier:{snapshot:()=>engine.atelierDiagnostics(),freeze:(paused:boolean)=>engine.setPaused('atelier-review',paused)}});
}
void main().catch(e=>{document.querySelector('#loading')!.textContent='The garden could not load. '+String(e);console.error(e);});
