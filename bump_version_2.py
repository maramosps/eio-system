import os

files_to_update = [
    "package.json",
    "extension/background.js",
    "frontend/downloads/version.json",
    "frontend/js/global-connection.js"
]

for file_path in files_to_update:
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        new_content = content.replace("4.7.12", "4.7.13")
        
        if content != new_content:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"Updated {file_path}")
