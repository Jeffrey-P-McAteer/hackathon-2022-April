
window.ws_url = 'wss://'+location.hostname+':'+location.port+'/ws'
window.socket = false;
window.immersive_ar_supported = false;
window.immersive_vr_supported = false;
try {
  window.is_ios = !!navigator.platform.match(/iPhone|iPod|iPad/);
} catch (err) { console.log(err); }


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
      //console.log('Got ws message: ' + event.data);
      // try to execute as JS code? Sounds safe!
      if (document.hasFocus()) {
        eval(event.data);
      }
    };

  }
}

setInterval(setup_ws, 6000);
setup_ws();

// GUI utils

window.geometries = {};

function draw_geometries(world_objects) {
  for (var i=0; i<world_objects.length; i+=1) {
    var o = world_objects[i];
    var name = o['name'];
    if (name in window.geometries) {
      // Just update position & metadata
      window.geometries[name].setAttribute('position', o['location'][0]+' '+o['location'][1]+' '+o['location'][2]);
      window.geometries[name].setAttribute('radius', o['radius'] ?? '0.10');

    }
    else {
      // Create it!
      if (o['type'] === 'circle') {
        window.geometries[name] = document.createElement('a-sphere');
        window.geometries[name].setAttribute('position', o['location'][0]+' '+o['location'][1]+' '+o['location'][2]);
        window.geometries[name].setAttribute('radius', o['radius'] ?? '0.10');
        window.geometries[name].setAttribute('color', '#EF2D5E');
        window.geometries[name].setAttribute('name', name);
        
        window.geometries[name].setAttribute('click-drag', '');
        
        document.getElementById('ar-scene').appendChild(window.geometries[name]);
      }
      else {
        console.log('un-create-able geometry: ', o['type']);
      }
    }
  }
}

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
  if (window.is_ios) {
    var msg_html = "Note: iOS safari currently does not ship with WebXR support, but Mozilla's WebXR Viewer does support WebXR. Please install Mozilla's WebXR Viewer to use this properly.<br><a href=\"https://apps.apple.com/us/app/webxr-viewer/id1295998056\">https://apps.apple.com/us/app/webxr-viewer/id1295998056</a>";
    document.getElementById('experience_target').innerHTML = msg_html;
    return;
  }

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
  }, 400);
})
