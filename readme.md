
# Hackathon Nonsense, April 2022 Edition

Plan:
 - build a python https server (vr/ar APIs are generally unavailable to http servers) that will:
    - Generate a self-signed ssl cert for a private IP
    - Serve a desktop/AR/VR web app
    - Serve a websocket comm ring the web app can use to keep state in sync across all connected devices (1 server == 1 "room")
    - Voice comm ring as well? May need to dip into WebRTC nonsense.

# Misc research

We will be using the [WebXR Device API](https://www.w3.org/TR/webxr/) to use native AR/VR capabilities for display and pointer/hand input.

For iOS mobile devices this will require [Mozilla's WebXR Viewer app](https://apps.apple.com/us/app/webxr-viewer/id1295998056).


# Misc resources

 - https://arvr.google.com/cardboard/viewerprofilegenerator/
 - http://www.sitesinvr.com/viewer/daydream2017/index.html
 - https://apps.apple.com/us/app/webxr-viewer/id1295998056

 - https://gist.github.com/SevenW/47be2f9ab74cac26bf21

VR JS Works on Oculus:

 - https://immersive-web.github.io/webxr-samples/

AR JS works on iphone / android:

 - https://ios-viewer.webxrexperiments.com/



# Dependencies

 - `python` (3.8 or better or so, not picky)
 - 


# Running

```bash
python -m run
```


# Using

Open `https://<server-ip>:4430/` in a browser on a cell phone or any VR headset.



