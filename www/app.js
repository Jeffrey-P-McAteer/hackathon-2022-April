
window.ws_url = 'wss://'+location.hostname+':'+location.port+'/ws'
window.socket = false;

function setup_ws() {
  if (!window.socket) {
    console.log('Connecting to '+window.ws_url)
    window.socket = new WebSocket(window.ws_url);
    window.socket.onclose = function (event) {
      window.socket = false;
    };
    window.socket.onopen = function (event) {
      console.log(event);
    };
    window.socket.onmessage = function (event) {
      console.log('Got ws message: ' + event.data);
      // try to execute as JS code? Sounds safe!
      eval(event.data);
    };

  }
}

setInterval(setup_ws,5000);
setup_ws();
