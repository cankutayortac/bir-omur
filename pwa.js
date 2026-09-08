(() => {
  'use strict';
  let installPrompt = null, waitingWorker = null;
  const status = { offlineReady: false, installed: matchMedia('(display-mode: standalone)').matches || !!navigator.standalone };
  function emit() { window.dispatchEvent(new CustomEvent('pwa-status', {detail:{...status,installable:!!installPrompt,updateReady:!!waitingWorker}})); }
  window.addEventListener('beforeinstallprompt', e => {e.preventDefault();installPrompt=e;emit();});
  window.addEventListener('appinstalled', () => {status.installed=true;installPrompt=null;emit();});
  globalThis.LifePWA = {
    status: () => ({...status,installable:!!installPrompt,updateReady:!!waitingWorker}),
    install: async () => { if (!installPrompt) return false; const prompt=installPrompt;installPrompt=null;await prompt.prompt();await prompt.userChoice;emit();return true; },
    update: () => { if(waitingWorker) waitingWorker.postMessage({type:'ACTIVATE_UPDATE'}); }
  };
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('./sw.js', {scope:'./',updateViaCache:'none'}).then(reg => {
      status.offlineReady=!!reg.active;
      if(reg.waiting) waitingWorker=reg.waiting;
      reg.addEventListener('updatefound',()=> {
        const worker=reg.installing;
        worker?.addEventListener('statechange',()=> {
          if(worker.state==='installed') {if(navigator.serviceWorker.controller)waitingWorker=worker;else status.offlineReady=true;emit();}
        });
      });
      emit();
    }).catch(error=>console.warn('Çevrimdışı hazırlık tamamlanamadı:',error.message));
    let refreshing=false;
    navigator.serviceWorker.addEventListener('controllerchange',()=> {
      status.offlineReady=true;
      if(waitingWorker&&!refreshing){refreshing=true;location.reload();}else emit();
    });
  }
})();
