
import re
import os

input_path = "reports/NeuroAssist_Updated_SRD.md"
output_path = "reports/NeuroAssist_Updated_SRD.html"

if not os.path.exists(input_path):
    input_path = "/Users/sindhu/.gemini/antigravity/brain/3db152fa-3468-49a0-b00f-3882e91d657b/NeuroAssist_Updated_SRD.md"

with open(input_path, "r") as f:
    content = f.read()

# Extract headers for TOC
headers = []
for line in content.split('\n'):
    if line.startswith("## "):
        title = line[3:].strip()
        anchor = title.lower().replace(" ", "-").replace("&", "").replace("requirements", "").strip("-")
        headers.append((title, anchor))

toc_html = "<ul>"
for title, anchor in headers:
    toc_html += f'<li><a href="#{anchor}">{title}</a></li>'
toc_html += "</ul>"

html_start = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NeuroAssist SRD v3.0</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <script>mermaid.initialize({{startOnLoad:true, theme: 'neutral'}});</script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {{
            --primary: #2563eb;
            --bg: #f8fafc;
            --sidebar-bg: #ffffff;
            --text: #1e293b;
            --border: #e2e8f0;
        }}
        body {{
            font-family: 'Inter', sans-serif;
            background: var(--bg);
            color: var(--text);
            margin: 0;
            display: flex;
            height: 100vh;
        }}
        /* Sidebar */
        .sidebar {{
            width: 280px;
            background: var(--sidebar-bg);
            border-right: 1px solid var(--border);
            padding: 2rem;
            overflow-y: auto;
            flex-shrink: 0;
            display: none; /* Hidden on mobile by default */
        }}
        @media(min-width: 1024px) {{ .sidebar {{ display: block; }} }}
        
        .sidebar h3 {{ font-size: 0.875rem; text-transform: uppercase; color: #64748b; margin-bottom: 1rem; }}
        .sidebar ul {{ list-style: none; padding: 0; }}
        .sidebar li {{ margin-bottom: 0.5rem; }}
        .sidebar a {{ text-decoration: none; color: #475569; font-size: 0.95rem; transition: color 0.2s; }}
        .sidebar a:hover {{ color: var(--primary); }}

        /* Main Content */
        .main {{
            flex: 1;
            padding: 2rem 4rem;
            overflow-y: auto;
            max-width: 1200px;
        }}
        
        /* Typography */
        h1 {{ font-size: 2.25rem; font-weight: 800; color: #0f172a; margin-bottom: 0.5rem; letter-spacing: -0.025em; }}
        h2 {{ font-size: 1.5rem; border-bottom: 2px solid var(--border); padding-bottom: 0.5rem; margin-top: 3rem; color: #334155; }}
        h3 {{ font-size: 1.25rem; margin-top: 2rem; color: #475569; }}
        p, li {{ line-height: 1.7; color: #334155; }}

        /* Requirement Cards */
        ul {{ padding-left: 1.5rem; }}
        li {{ margin-bottom: 0.5rem; }}
        /* Highlight Requirement IDs if they follow standard bold formatting */
        strong {{ color: #0f172a; font-weight: 600; }}

        /* Tables */
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 2rem 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }}
        th {{ background: #f1f5f9; text-align: left; padding: 1rem; font-weight: 600; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; }}
        td {{ padding: 1rem; border-top: 1px solid var(--border); font-size: 0.95rem; }}
        tr:hover td {{ background: #f8fafc; }}

        /* Mermaid */
        .mermaid {{
            background: white;
            padding: 2rem;
            border-radius: 12px;
            border: 1px solid var(--border);
            margin: 2rem 0;
            display: flex;
            justify-content: center;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }}

        /* Header Block */
        .doc-header {{
            background: white;
            padding: 2rem;
            border-radius: 12px;
            border: 1px solid var(--border);
            margin-bottom: 3rem;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }}
        .badge {{
            display: inline-block;
            background: #dbeafe;
            color: #1e40af;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 500;
            margin-bottom: 1rem;
        }}
    </style>
</head>
<body>
    <div class="sidebar">
        <h3>Contents</h3>
        {toc_html}
    </div>
    <div class="main">
        <div class="doc-header">
            <span class="badge">Official Specification</span>
"""

html_body = ""
lines = content.split('\n')
in_mermaid = False

# Skip original title creation as we handle it in header block
skip_title = True 

for line in lines:
    line = line.strip()
    
    # Custom Anchor injection for headers
    if line.startswith("## "):
        title = line[3:]
        anchor = title.lower().replace(" ", "-").replace("&", "").replace("requirements", "").strip("-")
        html_body += f'<h2 id="{anchor}">{title}</h2>\n'
        continue

    # Clean styling for headers
    if line.startswith("# "):
        if skip_title: 
             title = line[2:]
             html_body += f'<h1>{title}</h1>\n</div>\n' # Close doc-header
             skip_title = False
        else:
             html_body += f'<h1>{line[2:]}</h1>\n'
        continue

    if line.startswith("### "):
        html_body += f"<h3>{line[4:]}</h3>\n"
        continue

    # Mermaid
    if line.startswith("```mermaid"):
        in_mermaid = True
        html_body += '<div class="mermaid">\n'
        continue
    if line.startswith("```") and in_mermaid:
        in_mermaid = False
        html_body += '</div>\n'
        continue
    
    # Process Lists and Tables
    if in_mermaid:
        html_body += line + "\n"
    else:
        if line == "":
            html_body += "<br>\n"
        elif line.startswith("|"):
             # Simple table hack - cleaner approach would be real parser, but this preserves content
             # We rely on the CSS to style table rows if standard MD table
             if "---" in line: continue
             cols = [c.strip() for c in line.split('|') if c.strip()]
             if not html_body.endswith("</table>\n"):
                 html_body = html_body.rstrip()
                 # Check if previous line was table header
                 if "</th>" not in html_body: 
                     html_body += "<table>\n<thead><tr>" + "".join([f"<th>{c}</th>" for c in cols]) + "</tr></thead><tbody>\n"
                 else:
                     html_body = html_body.replace("</tbody></table>", "") + "<tr>" + "".join([f"<td>{c}</td>" for c in cols]) + "</tr></tbody></table>\n"
             else:
                  html_body = html_body.replace("</tbody></table>", "") + "<tr>" + "".join([f"<td>{c}</td>" for c in cols]) + "</tr></tbody></table>\n"

        elif line.startswith("* ") or line.startswith("- "):
            # Bullet points
            content_text = line[2:]
            # Bold highlights
            content_text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', content_text)
            html_body += f"<li>{content_text}</li>\n"
        elif line.startswith(">"):
             html_body += f"<blockquote style='border-left: 4px solid var(--primary); padding-left: 1rem; color: #64748b; font-style: italic;'>{line[1:]}</blockquote>\n"
        else:
             # Regular text
             content_text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', content_text if 'content_text' in locals() else line)
             if not line.startswith("```"):
                 html_body += f"<p>{content_text}</p>\n"

html_end = """
    </div>
</body>
</html>
"""

with open(output_path, "w") as f:
    f.write(html_start + html_body + html_end)

print(f"Generated {output_path}")
