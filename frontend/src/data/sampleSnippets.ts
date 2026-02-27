
export interface SampleSnippet {
  id: string;
  name: string;
  description: string;
  fileName: string;
  content: string;
}

export const SAMPLE_SNIPPETS: SampleSnippet[] = [
  {
    id: 'flask-sqli',
    name: 'Flask app with SQL injection',
    description: 'Login form concatenates user input into SQL',
    fileName: 'app_sqli.py',
    content: `from flask import Flask, request
import sqlite3

app = Flask(__name__)

@app.route('/login', methods=['POST'])
def login():
    username = request.form.get('username')
    password = request.form.get('password')
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    # VULNERABLE: direct string concatenation
    query = "SELECT * FROM users WHERE username='" + username + "' AND password='" + password + "'"
    cursor.execute(query)
    user = cursor.fetchone()
    conn.close()
    if user:
        return "Welcome!"
    return "Invalid credentials", 401

if __name__ == '__main__':
    app.run(debug=True)
`,
  },
  {
    id: 'eval-danger',
    name: 'Script using eval() on user input',
    description: 'Evaluates user-controlled string as Python code',
    fileName: 'calculator_eval.py',
    content: `#!/usr/bin/env python3
"""Dangerous calculator that uses eval() on user input."""

def calculate(expression: str) -> float:
    # VULNERABLE: eval() executes arbitrary code
    return eval(expression)

if __name__ == '__main__':
    while True:
        try:
            expr = input("Enter expression (e.g. 2+2): ")
            if expr.lower() in ('quit', 'exit', 'q'):
                break
            result = calculate(expr)
            print(f"Result: {result}")
        except Exception as e:
            print(f"Error: {e}")
`,
  },
  {
    id: 'insecure-file-handler',
    name: 'Insecure file path handler',
    description: 'Reads files using user-supplied path (path traversal)',
    fileName: 'file_server.py',
    content: `from flask import Flask, request, send_file
import os

app = Flask(__name__)
UPLOAD_DIR = '/var/app/uploads'

@app.route('/file')
def get_file():
    # VULNERABLE: no path sanitization - allows ../../../etc/passwd
    filename = request.args.get('name', '')
    filepath = os.path.join(UPLOAD_DIR, filename)
    return send_file(filepath, as_attachment=True, download_name=filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
`,
  },
  {
    id: 'pickle-deserialize',
    name: 'Unsafe pickle deserialization',
    description: 'Loads pickled data from untrusted source',
    fileName: 'config_loader.py',
    content: `import pickle
import os

def load_config(path: str) -> dict:
    """Load config from a pickle file."""
    with open(path, 'rb') as f:
        # VULNERABLE: pickle allows arbitrary code execution on load
        config = pickle.load(f)
    return config

if __name__ == '__main__':
    import sys
    config = load_config(sys.argv[1])
    print(config)
`,
  },
  {
    id: 'subprocess-shell',
    name: 'Subprocess with shell=True',
    description: 'Runs user input in a shell command',
    fileName: 'ping_tool.py',
    content: `import subprocess
import sys

def ping_host(host: str) -> str:
    # VULNERABLE: shell=True + unsanitized input
    result = subprocess.run(f"ping -c 3 {host}", shell=True, capture_output=True, text=True)
    return result.stdout or result.stderr

if __name__ == '__main__':
    host = sys.argv[1] if len(sys.argv) > 1 else "127.0.0.1"
    print(ping_host(host))
`,
  },
];
