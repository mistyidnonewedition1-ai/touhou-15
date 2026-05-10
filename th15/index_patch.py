with open('index.html', 'r', encoding='utf-8') as f:
    code = f.read()

old = """  <script src="particles.js"></script>
  <script src="pattern.js"></script>
  <script src="boss.js"></script>
  <script src="game.js"></script>"""
new = """  <script src="particles.js"></script>
  <script src="pattern.js"></script>
  <script src="difficulty.js"></script>
  <script src="menu.js"></script>
  <script src="boss.js"></script>
  <script src="game.js"></script>"""
code = code.replace(old, new)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(code)
print("HTML patched OK")
