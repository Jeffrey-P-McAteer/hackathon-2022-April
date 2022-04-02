
window.ws_url = 'ws://'+location.hostname+':'+location.port+'/ws'
window.socket = false;

function setup_ws() {
  if (!window.socket) {
    window.socket = new WebSocket(window.ws_url);
    
  }
}

setInterval(setup_ws,5000);
setup_ws();
