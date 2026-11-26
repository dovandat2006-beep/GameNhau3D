"""Download the selected, redistributable CC0 Poly Haven PBR maps at 1K."""
import json, pathlib, subprocess, time
from urllib.parse import urlparse
def download(url):
 if urlparse(url).scheme != "https" or urlparse(url).hostname not in {"api.polyhaven.com","dl.polyhaven.org"}: raise ValueError("Unexpected asset host")
 return subprocess.run(["curl","--fail","-L","-sS","--retry","2","--max-time","45",url],capture_output=True,check=True).stdout
ROOT=pathlib.Path(__file__).resolve().parents[1]/'public'/'textures'
ASSETS={'concrete':'concrete_floor_worn_001','plaster':'yellow_plaster','asphalt':'asphalt_02','metal':'corrugated_iron_02'}
manifest=[]
for local,asset in ASSETS.items():
 data=json.loads(download(f'https://api.polyhaven.com/files/{asset}'))
 for key in ['diff','nor_gl','rough']:
  source_key=next(k for k in {'diff':['diff','Diffuse','diffuse'],'nor_gl':['nor_gl'],'rough':['rough','Rough','roughness']}[key] if k in data)
  item=data[source_key]['1k']['jpg'];dest=ROOT/f'{local}-{key}.jpg'
  if not dest.exists():
   for attempt in range(3):
    try:
     dest.write_bytes(download(item['url']))
     break
    except Exception:
     if attempt==2: raise
     time.sleep(1)
  manifest.append({'file':dest.name,'asset':asset,'map':key,'source':item['url'],'license':'CC0-1.0','asset_page':f'https://polyhaven.com/a/{asset}'})
  print(dest.name,dest.stat().st_size)
(ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
