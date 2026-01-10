
import re
import os
import json

input_path = "reports/NeuroAssist_Technical_Documentation.md"
output_path = "reports/NeuroAssist_Technical_Documentation.html"

# Fallback path logic
if not os.path.exists(input_path):
    # Try the artifact path
    input_path = "/Users/sindhu/.gemini/antigravity/brain/3db152fa-3468-49a0-b00f-3882e91d657b/NeuroAssist_Technical_Documentation.md"

if not os.path.exists(input_path):
    print(f"Error: Could not find input file at {input_path}")
    exit(1)

with open(input_path, "r") as f:
    markdown_content = f.read()

# Escape backticks and script tags for embedding in JS string
# We can use JSON.stringify to safely embed it as a JS string
json_content = json.dumps(markdown_content)

html_template = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>NeuroAssist Technical Documentation</title>
    <!-- GitHub Markdown CSS for nice styling -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.0/github-markdown.min.css">
    
    <!-- Marked.js for robust Markdown rendering -->
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    
    <!-- Mermaid.js for diagrams -->
    <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
        mermaid.initialize({{ startOnLoad: false }});
        window.mermaid = mermaid;
    </script>

    <style>
        body {{
            box-sizing: border-box;
            min-width: 200px;
            max-width: 980px;
            margin: 0 auto;
            padding: 45px;
            background-color: #0d1117; /* Dark mode bg match */
        }}
        .markdown-body {{
            box-sizing: border-box;
            min-width: 200px;
            max-width: 980px;
            margin: 0 auto;
            padding: 45px;
            border-radius: 10px;
            /* Force Dark Mode Theme */
            color-scheme: dark;
            background-color: #0d1117;
            color: #c9d1d9;
        }}
        @media (max-width: 767px) {{
            .markdown-body {{
                padding: 15px;
            }}
        }}
        /* Fix Mermaid Background in Dark Mode */
        .mermaid {{
            background-color: #161b22;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            justify-content: center;
        }}
    </style>
</head>
<body class="markdown-body">
    <div id="content"></div>

    <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
        
        const rawMarkdown = {json_content};

        // Configure Marked to highlight mermaid blocks differently or look for them later
        // Default marked behavior: ```mermaid -> <pre><code class="language-mermaid">...</code></pre>
        document.getElementById('content').innerHTML = marked.parse(rawMarkdown);

        // Post-process for Mermaid
        // Find all <pre><code class="language-mermaid"> blocks and convert to <div class="mermaid">
        const mermaidBlocks = document.querySelectorAll('pre code.language-mermaid');
        mermaidBlocks.forEach(block => {{
            const div = document.createElement('div');
            div.className = 'mermaid';
            div.textContent = block.textContent; // Extract raw diagram text
            
            // Replace the <pre> (parent of code) with the new <div>
            block.parentElement.replaceWith(div);
        }});

        // Run Mermaid
        await mermaid.run({{
            querySelector: '.mermaid'
        }});
    </script>
</body>
</html>
"""

with open(output_path, "w") as f:
    f.write(html_template)

print(f"Generated {output_path}")
