
# Python builtins
import os
import sys
import subprocess
import shutil
import importlib
import asyncio
import ssl
import traceback


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

# Misc utilities
def c(*args):
  subprocess.run([x for x in args if x is not None], check=True)

def maybe(fun):
  try:
    return fun()
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

# Actual event-driven subroutines, plus some global memory.

world_objects = [
  {'type': 'circle', 'location': [2.0, 2.0, 0.0]},
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

  async for msg in ws:
    if msg.type == aiohttp.WSMsgType.TEXT:
      print('WS From {}: {}'.format(host, msg.data))
      
      # Broadcast to everyone else
      for w in all_websockets:
        if w != ws:
          await w.send_str(msg.data)
      
    elif msg.type == aiohttp.WSMsgType.ERROR:
      print('ws connection closed with exception {}'.format(ws.exception()))

  all_websockets.remove(ws)

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
        print('Pinging {} websockets'.format(len(all_websockets)))
        for w in all_websockets:
          await w.send_str('console.log("Ping from server!")')
    except:
      traceback.print_exc()

    await asyncio.sleep(2)

########################################################
# 
# Le grande main()
# 
########################################################
def main(args=sys.argv):

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
    aiohttp.web.get('/ws', ws_req_handler)
  ])

  server.on_startup.append(start_background_tasks)

  ssl_ctx = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
  ssl_ctx.load_cert_chain(*get_ssl_cert_and_key_or_generate())

  aiohttp.web.run_app(server, ssl_context=ssl_ctx, port=4430)




if __name__ == '__main__':
  main()