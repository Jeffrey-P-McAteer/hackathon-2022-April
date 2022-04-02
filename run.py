
# Python builtins
import os
import sys
import subprocess
import shutil
import importlib
import asyncio
import ssl


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


# Classes & API glue




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

########################################################
# 
# Le grande main()
# 
########################################################
def main(args=sys.argv):

  todos = [
      {"id":"1","title":"Go to the garden"},
      {"id":"2","title":"Go to the market"},
      {"id":"3","title":"Prepare dinner"},
  ]

  import aiohttp.web

  async def handle(request):
    return aiohttp.web.json_response(todos)

  async def websocket_handler(request):

    ws = aiohttp.web.WebSocketResponse()
    await ws.prepare(request)

    async for msg in ws:
        if msg.type == aiohttp.WSMsgType.TEXT:
            if msg.data == 'close':
                await ws.close()
            else:
                await ws.send_str(msg.data + '/answer')
        elif msg.type == aiohttp.WSMsgType.ERROR:
            print('ws connection closed with exception %s' %
                  ws.exception())

    print('websocket connection closed')

    return ws


  server = aiohttp.web.Application()
  server.add_routes([aiohttp.web.get('/', handle), aiohttp.web.get('/todos', handle), aiohttp.web.get('/ws', websocket_handler)])

  ssl_ctx = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
  ssl_ctx.load_cert_chain(*get_ssl_cert_and_key_or_generate())


  aiohttp.web.run_app(server, ssl_context=ssl_ctx, port=4430)




if __name__ == '__main__':
  main()