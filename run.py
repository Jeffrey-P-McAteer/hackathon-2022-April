
# Python builtins
import os
import sys
import subprocess
import shutil
import importlib
import asyncio
import ssl
import traceback
import json
import random


# Utility method to wrap imports with a call to pip to install first.
# > "100% idiot-proof!" -- guy on street selling rusty dependency chains.
def import_maybe_installing_with_pip(import_name, pkg_name=None):
  if pkg_name is None:
    pkg_name = import_name # 90% of all python packages share their name with their module
  pkg_spec = importlib.util.find_spec(import_name)
  install_cmd = []
  if pkg_spec is None:
    # package missing, install via pip to user prefix!
    print('Attempting to install module {} (package {}) with pip...'.format(import_name, pkg_name))
    install_cmd = [sys.executable, '-m', 'pip', 'install', '--user', pkg_name]
    subprocess.run(install_cmd, check=False)
  pkg_spec = importlib.util.find_spec(import_name)
  if pkg_spec is None:
    raise Exception('Cannot find module {}, attempted to install {} via pip: {}'.format(import_name, pkg_name, ' '.join(install_cmd) ))
  
  return importlib.import_module(import_name)

# 3rd-party libs
aiohttp = import_maybe_installing_with_pip('aiohttp')
import aiohttp.web

linetimer = import_maybe_installing_with_pip('linetimer')
from linetimer import CodeTimer

# Misc utilities
def c(*args):
  subprocess.run([x for x in args if x is not None], check=True)

def maybe(fun):
  try:
    return fun()
  except:
    traceback.print_exc()
    return None

async def maybe_await(fun):
  try:
    return await fun()
  except:
    traceback.print_exc()
    return None


def j(*file_path_parts):
  return os.path.join(*[x for x in file_path_parts if x is not None])

def e(*file_path_parts):
  return os.path.exists(j(*file_path_parts))

def get_ssl_cert_and_key_or_generate():
  ssl_dir = 'ssl'
  if not e(ssl_dir):
    os.makedirs(ssl_dir)
  
  key_file = j(ssl_dir, 'server.key')
  cert_file = j(ssl_dir, 'server.crt')

  if e(key_file) and e(cert_file):
    return cert_file, key_file
  else:
    if e(key_file):
      os.remove(key_file)
    if e(cert_file):
      os.remove(cert_file)
  
  if not shutil.which('openssl'):
    raise Exception('Cannot find the tool "openssl", please install this so we can generate ssl certificates for our servers! Alternatively, manually create the files {} and {}.'.format(cert_file, key_file))

  generate_cmd = ['openssl', 'req', '-x509', '-sha256', '-nodes', '-days', '28', '-newkey', 'rsa:2048', '-keyout', key_file, '-out', cert_file]
  subprocess.run(generate_cmd, check=True)

  return cert_file, key_file

def get_local_ip():
    import socket
    """Try to determine the local IP address of the machine."""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

        # Use Google Public DNS server to determine own IP
        sock.connect(('8.8.8.8', 80))

        return sock.getsockname()[0]
    except socket.error:
        try:
            return socket.gethostbyname(socket.gethostname())
        except socket.gaierror:
            return '127.0.0.1'
    finally:
        sock.close() 

# Actual event-driven subroutines, plus some global memory.

world_objects = [
  {'name': 'obj-01', 'type': 'circle', 'location': [0.0, -0.7, 0.25], 'radius': 0.10},
]
all_websockets = []

async def http_req_handler(req):
  peername = req.transport.get_extra_info('peername')
  host = 'unk'
  if peername is not None:
    host, port = peername
  print('http req from {} for {}'.format(host, req.path))

  # Normalize & trim path
  path = req.path.lower()
  while path.startswith('/'):
    path = path[1:]

  if len(path) < 1:
    path = 'index.html'

  possible_www_f = j('www', path)

  if e(possible_www_f):
    print('Returning {} to {}'.format(possible_www_f, host))
    return aiohttp.web.FileResponse(possible_www_f)

  print('Returning 404 for {} to {}'.format(req.path, host))
  return aiohttp.web.HTTPNotFound()


async def ws_req_handler(req):
  global world_objects
  global all_websockets

  peername = req.transport.get_extra_info('peername')
  host = 'unk'
  if peername is not None:
    host, port = peername

  print('ws req from {}'.format(host))

  ws = aiohttp.web.WebSocketResponse()
  await ws.prepare(req)

  all_websockets.append(ws)

  await ws.send_str('set_my_name("{}")'.format(host))

  async for msg in ws:
    if msg.type == aiohttp.WSMsgType.TEXT:
      print('WS From {}: {}'.format(host, msg.data))
      
      if msg.data.startswith('message='):
        continue

      # Broadcast to everyone else
      with CodeTimer('Broadcast to everyone else', unit='ms'):
        await asyncio.gather(*[ maybe_await(lambda: w.send_str(msg.data)) for w in all_websockets if w != ws])
      
    elif msg.type == aiohttp.WSMsgType.ERROR:
      print('ws connection closed with exception {}'.format(ws.exception()))

  all_websockets.remove(ws)

  await asyncio.gather(*[ maybe_await(lambda: w.send_str('remove_camera_named("{}")'.format(host))) for w in all_websockets])

  return ws

async def start_background_tasks(server):
  loop = asyncio.get_event_loop()
  task = loop.create_task(heartbeat_task())

async def heartbeat_task():
  global world_objects
  global all_websockets
  while True:
    try:
      if len(all_websockets) > 0:
        with CodeTimer('Pinging {} websockets'.format(len(all_websockets)), unit='ms'):
          world_objs_str = json.dumps(world_objects)
          world_objs_plot_js = 'draw_geometries({})'.format(world_objs_str)
          
          ws_to_rm = []
          for w in all_websockets:
            try:
              await w.send_str(world_objs_plot_js)
            except:
              traceback.print_exc()
              ws_to_rm.append(w)

          for w in ws_to_rm:
            all_websockets.remove(w)

      # Also move object randomly
      for obj in world_objects:
        if obj.get('name', '') == 'obj-01':
          obj['location'][0] = random.uniform(-0.40, 0.40)

    except:
      traceback.print_exc()

    # Wait 1 second plus 1/5 second per device (room size of 5 clients means 2 second delays)
    await asyncio.sleep(1.0 + (0.2 * len(all_websockets)))


def main_run_https_server(args=sys.argv):
  # Change directory to the parent of run.py
  repo_root = os.path.dirname(os.path.abspath(__file__))
  print('repo_root={}'.format(repo_root))
  os.chdir(repo_root)

  cert_file, key_file = get_ssl_cert_and_key_or_generate()

  server = aiohttp.web.Application()

  www_file_routes = []
  for root, dirs, files in os.walk('www'):
    for file in files:
      local_path = j(root, file)
      web_path = local_path[3:]
      print('Adding web route to file {}'.format(local_path))
      www_file_routes.append( aiohttp.web.get(web_path, http_req_handler) )

  server.add_routes(www_file_routes + [
    aiohttp.web.get('/', http_req_handler),
    aiohttp.web.get('/ws', ws_req_handler),
    # Useful on ios to install our temporary ssl cert system-wide
    aiohttp.web.get('/server.crt', lambda req: aiohttp.web.FileResponse(cert_file) ),
  ])

  server.on_startup.append(start_background_tasks)

  ssl_ctx = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
  ssl_ctx.load_cert_chain(cert_file, key_file)

  print('Your LAN ip address is: https://{}:4430/'.format(get_local_ip()))

  aiohttp.web.run_app(server, ssl_context=ssl_ctx, port=4430)

def install_as_systemd_service():
  service_name = 'hackathon-2022-april'

  service_file = '/etc/systemd/system/{}.service'.format(service_name)
  run_py = os.path.abspath(__file__)
  print('Installing {} as systemd service {}.service ({})'.format(run_py, service_name, service_file))

  if os.getuid() != 0:
    time.sleep(0.5)
    print('WARNING: you do not appear to be root, the following tasks will likely fail!')
    time.sleep(1)

  with open(service_file, 'w') as fd:
    fd.write(('''
[Unit]
Description=A Hackathon submission with legs
After=network-online.target

[Service]
ExecStart='''+os.path.abspath(sys.executable)+''' '''+run_py+'''
Restart=always
RestartSec=3s

[Install]
WantedBy=multi-user.target

''').strip())

  # Also add a git-clone task that runs periodically
  git_cloner_service_file = '/etc/systemd/system/{}-git-cloner.service'.format(service_name)
  git_cloner_timer_file = '/etc/systemd/system/{}-git-cloner.timer'.format(service_name)
  git_exe = shutil.which('git')

  if git_exe:
    print('Also adding git-clone task: {}.service ({} / {})'.format(service_name, git_cloner_service_file, git_cloner_timer_file))
    with open(git_cloner_service_file, 'w') as fd:
      fd.write(('''
[Unit]
Description=A Hackathon submission with legs (periodic git clone task)
After=network-online.target

[Service]
ExecStart='''+os.path.abspath(git_exe)+''' pull
WorkingDirectory='''+os.path.dirname(run_py)+'''

  ''').strip())

    with open(git_cloner_timer_file, 'w') as fd:
      fd.write(('''
[Unit]
Description=A Hackathon submission with legs (periodic git clone task timer)

[Timer]
OnBootSec=15min
OnUnitActiveSec=1h

[Install]
WantedBy=timers.target
  ''').strip())

  print('Installed! Next run:')
  print('  sudo systemctl daemon-reload')
  if git_exe:
    print('  sudo systemctl enable --now {}-git-cloner.timer'.format(service_name))
  print('  sudo systemctl enable --now {}.service'.format(service_name))
  print('')
  print('To restart the service:')
  print('  sudo systemctl restart {}.service'.format(service_name))
  print('To attach to / read service logs:')
  print('  journalctl -f -u {}.service'.format(service_name))
  print('  journalctl  -u {}.service'.format(service_name))



########################################################
# 
# Le grande main()
# 
########################################################
def main(args=sys.argv):
  if 'install' in args:
    install_as_systemd_service()
  else:
    main_run_https_server(args)
  




if __name__ == '__main__':
  main()