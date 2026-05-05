import urllib.request
import json

try:
    req = urllib.request.Request("http://localhost:8000/api/v1/projects")
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print(f"Total projects: {data.get('total')}")
        for p in data.get('results', [])[:3]:
            print(f"- {p['title']} [{p['status']}]")
except Exception as e:
    print(f"Error: {e}")
