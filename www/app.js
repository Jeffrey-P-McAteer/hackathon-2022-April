
window.ws_url = 'wss://'+location.hostname+':'+location.port+'/ws'
window.socket = false;
window.immersive_ar_supported = false;
window.immersive_vr_supported = false;

// Development cheating
window.onerror = function(message, source, lineno, colno, error) {
  window.socket.send(
    // Ensures a "safe" string for browsers to eval
    JSON.stringify('message='+message+' source='+source+' lineno='+lineno+' error='+error)
  );
};

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

setInterval(setup_ws, 6000);
setup_ws();

// GUI utils

function checkSupportedState_immersive_ar() {
  return new Promise((resolve, reject) => {
    navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
      if (supported) {
        window.immersive_ar_supported = true;
        resolve();
      }
      else{
        window.immersive_ar_supported = false;
      }
    })
  });
}

function checkSupportedState_immersive_vr() {
  return new Promise((resolve, reject) => {
    navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
      if (supported) {
        window.immersive_vr_supported = true;
        resolve();
      }
      else{
        window.immersive_vr_supported = false;
      }
    })
  });
}

function render_immersive_vr() {
  document.getElementById('experience_target').innerText = 'Loading Immersive VR!';
}
function render_immersive_ar() {
  document.getElementById('experience_target').innerText = 'Loading Immersive AR!'; 
}
function render_basic() {
  document.getElementById('experience_target').innerText = 'Loading Basic!'; 
}

// GUI drivers
function render_app() {
  checkSupportedState_immersive_vr();
  checkSupportedState_immersive_ar();

  if (window.immersive_vr_supported) {
    render_immersive_vr();
  }
  else if (window.immersive_ar_supported) {
    render_immersive_ar();
  }
  else {
    render_basic();
  }

}

window.addEventListener('DOMContentLoaded', () => {
  checkSupportedState_immersive_vr();
  checkSupportedState_immersive_ar();
  setTimeout(() => {
    render_app();
  }, 800)
})
