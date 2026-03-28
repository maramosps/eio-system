import os

file_path = "extension/popup.html"
with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

lines_to_delete = set()
# Tab button
for i in range(78-1, 87-1): lines_to_delete.add(i)
# Quick actions Comment/DM
for i in range(117-1, 127-1): lines_to_delete.add(i)
# Action cards Comment/DM
for i in range(381-1, 389-1): lines_to_delete.add(i)
# mensagensTab content
for i in range(537-1, 599-1): lines_to_delete.add(i)

new_lines = []
for idx, line in enumerate(lines):
    if idx not in lines_to_delete:
        new_lines.append(line)

with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("Done removing lines.")
