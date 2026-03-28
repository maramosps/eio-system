import sys
import os

files_to_update = [
    ("extension/manifest.json", "4.7.12", "4.7.13"),
    ("frontend/downloads/version.json", "v4.7.12", "v4.7.13"),
    ("frontend/dashboard.html", "v4.7.12", "v4.7.13"),
    ("frontend/js/global-connection.js", "v4.7.12", "v4.7.13"),
    ("extension/content.js", "v4.7.12", "v4.7.13"),
    ("extension/background.js", "v4.7.12", "v4.7.13"),
    ("extension/popup.js", "v4.7.12", "v4.7.13"),
    ("frontend/dashboard-v462.js", "v4.7.12", "v4.7.13"),
]

for file_path, old_v, new_v in files_to_update:
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        new_content = content.replace(old_v, new_v)
        
        if content != new_content:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"Updated {file_path}")
        else:
            print(f"{old_v} not found in {file_path}")
    else:
        print(f"File not found: {file_path}")
