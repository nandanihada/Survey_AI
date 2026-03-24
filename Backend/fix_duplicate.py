#!/usr/bin/env python3

# Script to remove duplicate route from app.py
with open('app.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the duplicate route at the end
start_idx = None
for i, line in enumerate(lines):
    if '@app.route("/l/<short_id>")' in line and i > 10000:
        start_idx = i
        break

if start_idx is not None:
    # Remove everything from the duplicate route onwards
    # Keep only the main execution part
    main_part = []
    for i in range(len(lines)):
        line = lines[i]
        if 'if __name__ == \'__main__\':' in line:
            # Add the main execution block
            main_part.extend(lines[i:])
            break
        elif i < start_idx:
            main_part.append(line)
    
    # Write back the cleaned content
    with open('app.py', 'w', encoding='utf-8') as f:
        f.writelines(main_part)
    
    print(f"Removed duplicate route starting at line {start_idx + 1}")
    print("Fixed duplicate route issue!")
else:
    print("No duplicate route found")
