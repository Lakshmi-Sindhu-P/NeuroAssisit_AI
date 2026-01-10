
import re
import os

input_path = "reports/NeuroAssist_MAX_PRD.md"
output_path = "reports/NeuroAssist_MAX_PRD.html"

# Read Markdown
if not os.path.exists(input_path):
    # Fallback if moved
    input_path = "/Users/sindhu/.gemini/antigravity/brain/3db152fa-3468-49a0-b00f-3882e91d657b/NeuroAssist_MAX_PRD.md"

with open(input_path, "r") as f:
    content = f.read()

# HTML Wrapper
html_start = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>NeuroAssist MAX PRD</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <script>mermaid.initialize({startOnLoad:true});</script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.0/github-markdown.min.css">
    <style>
        body {
            box-sizing: border-box;
            min-width: 200px;
            max-width: 980px;
            margin: 0 auto;
            padding: 45px;
        }
        .markdown-body {
            box-sizing: border-box;
            min-width: 200px;
            max-width: 980px;
            margin: 0 auto;
            padding: 45px;
        }
        @media (max-width: 767px) {
            .markdown-body {
                padding: 15px;
            }
        }
        .mermaid {
            display: flex;
            justify-content: center;
            background: #f9f9f9;
            padding: 20px;
            border: 1px solid #eee;
            border-radius: 8px;
        }
    </style>
</head>
<body class="markdown-body">
"""

html_end = """
</body>
</html>
"""

# Simple Markdown to HTML conversion
lines = content.split('\n')
html_content = ""
in_mermaid = False

for line in lines:
    # Headers
    if line.startswith("# "):
        html_content += f"<h1>{line[2:]}</h1>\n"
        continue
    if line.startswith("## "):
        html_content += f"<h2>{line[3:]}</h2>\n"
        continue
    if line.startswith("### "):
        html_content += f"<h3>{line[4:]}</h3>\n"
        continue
    
    # Mermaid Code Blocks
    if line.strip().startswith("```mermaid"):
        in_mermaid = True
        html_content += '<div class="mermaid">\n'
        continue
    if line.strip().startswith("```") and in_mermaid:
        in_mermaid = False
        html_content += '</div>\n'
        continue
    
    # Content
    if in_mermaid:
        html_content += line + "\n"
    else:
        # Paragraphs
        if line.strip() == "":
            html_content += "<br>\n"
        elif line.strip().startswith("|"):
            # Very crude table row
            html_content += f"<p style='font-family:monospace'>{line}</p>\n"
        else:
            html_content += f"<p>{line}</p>\n"

full_html = html_start + html_content + html_end

with open(output_path, "w") as f:
    f.write(full_html)

print(f"Generated {output_path}")
