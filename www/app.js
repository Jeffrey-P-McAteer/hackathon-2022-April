
window.ws_url = 'wss://'+location.hostname+':'+location.port+'/ws'
window.socket = false;
window.immersive_ar_supported = false;
window.immersive_vr_supported = false;
try {
  window.is_ios = !!navigator.platform.match(/iPhone|iPod|iPad/);
} catch (err) { console.log(err); }
window.my_name = '';


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

function set_my_name(name) {
  if (window.my_name.length > 0) {
    window.socket.send('remove_camera_named("'+name+'")');
  }
  window.my_name = name;
  window.socket.send('add_camera_named("'+name+'")');
}

function remove_camera_named(name) {
  if (name in window.geometries && window.geometries[name]) {
    var elm = window.geometries[name];
    window.geometries[name] = undefined;
    elm.remove();

    var elm = window.geometries[name+'_label'];
    window.geometries[name+'_label'] = undefined;
    elm.remove();
  }
}

function move_camera_named(name, pos_x, pos_y, pos_z, rot_x, rot_y, rot_z) {
  if (name in window.geometries && window.geometries[name]) {
    // Cheating, move all cameras 0.25 higher
    //pos_y += 0.25;
    pos_y += 0.95;

    var p = window.geometries[name].getAttribute('position');
    var r = window.geometries[name].getAttribute('rotation');

    p.x = pos_x;
    p.y = pos_y;
    p.z = pos_z;
    
    r._x = rot_x;
    r._y = rot_y;
    r._z = rot_z;

    window.geometries[name].setAttribute('position', p);
    window.geometries[name].setAttribute('rotation', r);

    var p = window.geometries[name+'_label'].getAttribute('position');
    var r = window.geometries[name+'_label'].getAttribute('rotation');

    p.x = pos_x - 0.2;
    p.y = pos_y + 0.4;
    p.z = pos_z;
    
    r._x = rot_x;
    r._y = rot_y;
    r._z = rot_z;

    window.geometries[name+'_label'].setAttribute('position', p);
    window.geometries[name+'_label'].setAttribute('rotation', r);

  }
  else {
    add_camera_named(name);
    if (name in window.geometries && window.geometries[name]) {
      // Not re-typing all that
      move_camera_named(name, pos_x, pos_y, pos_z, rot_x, rot_y, rot_z);
    }
  }
}

function add_camera_named(name) {
  remove_camera_named(name);
  window.geometries[name] = document.createElement('a-sphere');
  //window.geometries[name] = document.createElement('a-obj-model');
  //window.geometries[name].setAttribute('src', '#player_model');
  //window.geometries[name].setAttribute('mtl', '#player_model_mtl');
  window.geometries[name].setAttribute('position', '0 0 0');
  window.geometries[name].setAttribute('radius', '0.08');
  window.geometries[name].setAttribute('color', '#fefefe');
  window.geometries[name].setAttribute('scale', '0.02 0.02 0.02');
  window.geometries[name].setAttribute('name', name);

  document.getElementById('ar-scene').appendChild(window.geometries[name]);

  window.geometries[name+'_label'] = document.createElement('a-text');
  window.geometries[name+'_label'].setAttribute('position', '0 0.4 0');
  window.geometries[name+'_label'].setAttribute('color', '#fefefe');
  window.geometries[name+'_label'].setAttribute('side', 'double');
  window.geometries[name+'_label'].setAttribute('scale', '0.3 0.3 0.3');
  window.geometries[name+'_label'].setAttribute('name', name);
  window.geometries[name+'_label'].setAttribute('value', name);

  document.getElementById('ar-scene').appendChild(window.geometries[name+'_label']);

}


// GUI utils

window.geometries = {};

function bounce_geometry(name) {
  if (name in window.geometries && window.geometries[name]) {
    //var position_slices = (''+window.geometries[name].getAttribute('position')).split(' ');
    //console.log('position=', window.geometries[name].getAttribute('position'));
    // var x0 = parseFloat(position_slices[0]);
    // var y0 = parseFloat(position_slices[1]);
    // var z0 = parseFloat(position_slices[2]);

    var p = window.geometries[name].getAttribute('position');

    var x0 = p.x;
    var y0 = p.y;
    var z0 = p.z;

    var x1 = x0;
    var y1 = y0 + 0.3;
    var z1 = z0;

    window.geometries[name].setAttribute('animation', 'property: position; from: '+x0+' '+y0+' '+z0+'; to: '+x1+' '+y1+' '+z1+'; easing: easeInOutSine; dur: 450; dir: alternate; loop: 1;');

    //console.log('we did bounce_geometry("'+name+'") x0='+x0+' y0='+y0+' z0='+z0+'x1='+x1+' y1='+y1+' z1='+z1);

    setTimeout(function(){
      window.geometries[name].removeAttribute('animation');
    }, 800);

  }
}

function draw_geometries(world_objects) {
  for (var i=0; i<world_objects.length; i+=1) {
    var o = world_objects[i];
    var name = o['name'];
    if (name in window.geometries && window.geometries[name]) {
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
        window.geometries[name].classList.add('raytarget');

        window.geometries[name].addEventListener('click', function (evt) {
          bounce_geometry(name);
          window.socket.send("bounce_geometry(\""+name+"\");");
        });

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
    if (navigator.xr) {
      navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
        if (supported) {
          window.immersive_ar_supported = true;
          resolve();
        }
        else{
          window.immersive_ar_supported = false;
        }
      })
    }
  });
}

function checkSupportedState_immersive_vr() {
  return new Promise((resolve, reject) => {
    if (navigator.xr) {
      navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
        if (supported) {
          window.immersive_vr_supported = true;
          resolve();
        }
        else{
          window.immersive_vr_supported = false;
        }
      })
    }
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
    alert("Note: iOS safari currently does not ship with WebXR support, but Mozilla's WebXR Viewer does support WebXR. Please install Mozilla's WebXR Viewer to use this properly.");
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
});


window.last_camera_rotation = undefined;
window.last_camera_position = undefined;
window.camera_rot_epsilon = 0.04;
window.camera_pos_epsilon = 0.01;

// window.last_pos_str = '';

AFRAME.registerComponent('camera-property-listener', {
  tick: function () {
    // `this.el` is the element.
    // `object3D` is the three.js object.

    //console.log('this.el.object3D.position=', this.el.object3D.position);
    // var print_stuff = false;
    // if ('x='+this.el.object3D.position.x !== window.last_pos_str) {
    //   window.last_pos_str = 'x='+this.el.object3D.position.x;
    //   console.log('this.el.object3D.position=', this.el.object3D.position);
    //   print_stuff = true;
    // }

    // `rotation` is a three.js Euler using radians. `quaternion` also available.
    if (!window.last_camera_rotation) {
      window.last_camera_rotation = clone(this.el.object3D.rotation);
    }
    var rot_changed_significantly = (
      Math.abs(window.last_camera_rotation._x - this.el.object3D.rotation._x) > window.camera_rot_epsilon ||
      Math.abs(window.last_camera_rotation._y - this.el.object3D.rotation._y) > window.camera_rot_epsilon ||
      Math.abs(window.last_camera_rotation._z - this.el.object3D.rotation._z) > window.camera_rot_epsilon
    );


    // `position` is a three.js Vector3.
    if (!window.last_camera_position) {
      window.last_camera_position = clone(this.el.object3D.position);
    }
    var pos_changed_significantly = (
      Math.abs(window.last_camera_position.x - this.el.object3D.position.x) > window.camera_pos_epsilon ||
      Math.abs(window.last_camera_position.y - this.el.object3D.position.y) > window.camera_pos_epsilon ||
      Math.abs(window.last_camera_position.z - this.el.object3D.position.z) > window.camera_pos_epsilon
    );
    
    // if (print_stuff) {
    //   console.log('rot_changed_significantly=', rot_changed_significantly, ' pos_changed_significantly=', pos_changed_significantly, ' window.my_name.length > 1=', window.my_name.length > 1);
    //   console.log('window.last_camera_position.x=', window.last_camera_position.x, ' this.el.object3D.position.x=', this.el.object3D.position.x, 'diff=', Math.abs(window.last_camera_position.x - this.el.object3D.position.x));
    //   console.log('window.last_camera_position.y=', window.last_camera_position.y, ' this.el.object3D.position.y=', this.el.object3D.position.y, 'diff=', Math.abs(window.last_camera_position.y - this.el.object3D.position.y));
    //   console.log('window.last_camera_position.z=', window.last_camera_position.z, ' this.el.object3D.position.z=', this.el.object3D.position.z, 'diff=', Math.abs(window.last_camera_position.z - this.el.object3D.position.z));
    // }

    if (rot_changed_significantly || pos_changed_significantly) {
      if (window.my_name.length > 1) {
        var r = window.last_camera_rotation;
        var p = window.last_camera_position;
        window.socket.send('move_camera_named("'+window.my_name+'", '+p.x+', '+p.y+', '+p.z+', '+r._x+', '+r._y+', '+r._z+');');
        //console.log('move_camera_named("'+window.my_name+'", '+p.x+', '+p.y+', '+p.z+', '+r._x+', '+r._y+', '+r._z+');');

        // Save positions as well
        window.last_camera_rotation = clone(this.el.object3D.rotation);
        window.last_camera_position = clone(this.el.object3D.position);
      }
    }

  }
});

// Also blast our position every 5 seconds no matter what;
setInterval(function() {
  if (window.my_name.length > 1) {
    var r = window.last_camera_rotation;
    var p = window.last_camera_position;
    window.socket.send('move_camera_named("'+window.my_name+'", '+p.x+', '+p.y+', '+p.z+', '+r._x+', '+r._y+', '+r._z+');');
  }
}, 5200);
