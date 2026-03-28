import re
import os

files_to_update = [
    "frontend/dashboard.html",
    "frontend/admin.html",
    "frontend/crm.html",
    "frontend/termo.html",
    "frontend/guia.html",
    "frontend/MANUAL_DE_USO_EIO.html"
]

for fp in files_to_update:
    if os.path.exists(fp):
        with open(fp, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Remove nav item blocks for Agentes IA and Mensagens Auto
        # This regex looks for an <a ...> that contains Agentes IA or Mensagens Auto and removes the whole <a> tag.
        # We assume the </a> is exactly matched
        
        # Remove Agentes IA nav item
        content = re.sub(r'<a[^>]*class="eio-nav-item"[^>]*>[\s\S]*?Agentes IA[\s\S]*?</a>', '', content, flags=re.IGNORECASE)
        # Remove Mensagens Auto nav item
        content = re.sub(r'<a[^>]*class="eio-nav-item"[^>]*>[\s\S]*?Mensagens Auto[\s\S]*?</a>', '', content, flags=re.IGNORECASE)
        
        with open(fp, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Cleaned navigation links in {fp}")

# In dashboard.html we also want to remove the specific section <div id="agents">
dash_path = "frontend/dashboard.html"
if os.path.exists(dash_path):
    with open(dash_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We can delete "Central de Agentes IA" block if we can find its boundary.
    # Alternatively, just let it be orphaned if it's too risky, but user said "COMPLETELY DELETE".
    # I'll just remove anything between `<div id="agents" class="eio-page">` and the next `<div id="`
    content = re.sub(r'<div id="agents"\s+class="eio-page"[\s\S]*?(?=<div id="\w+" class="eio-page"|</main>)', '', content, flags=re.IGNORECASE)
    
    with open(dash_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Cleaned agents section in dashboard.html")

# Remove any dedicated files
for page in ['frontend/agentes.html', 'frontend/mensagens.html']:
    if os.path.exists(page):
        os.remove(page)
        print(f"Deleted {page}")
