"""Generates Word-authored OMML fixtures through Word's AppleScript math object model."""
import json, subprocess, sys

TYPES = {
    'frac': 'math fraction type', 'rad': 'math radical type', 'sub': 'math subscript type', 'sup': 'math superscript type',
    'subsup': 'math sub superscript type', 'pre': 'math left sub superscript type', 'nary': 'math nary operator type',
    'd': 'math delimiters type', 'func': 'math function apply type', 'limlow': 'math lower limit type', 'limupp': 'math upper limit type',
    'acc': 'math accent type', 'bar': 'math function bar type', 'group': 'math stretch stack type', 'm': 'math matrix type',
    'eqarr': 'math equation array type', 'box': 'math box type', 'border': 'math boxed formula type', 'phant': 'math phantom type',
    'nor': 'math normal text type', 'lit': 'math literal text type',
}
# Property owner on the math function for each type.
OWNER = {'frac': 'fraction', 'rad': 'radical', 'nary': 'nary', 'd': 'delimiter', 'acc': 'accent', 'bar': 'overbar',
         'group': 'group char', 'm': 'matrix', 'eqarr': 'equation array', 'box': 'box', 'border': 'border box',
         'phant': 'phantom', 'subsup': 'sub and super script', 'sub': 'subscript', 'sup': 'superscript',
         'pre': 'left scripts', 'func': 'func', 'limlow': 'lower limit', 'limupp': 'upper limit'}
counter = [0]
# Creation placeholder; removed by one document-wide replace after every equation is built.
PLACEHOLDER = '¤'

def fresh(prefix):
    counter[0] += 1
    return f'{prefix}{counter[0]}'

def fill(target, node, out):
    """Emits AppleScript filling math object variable `target` with node."""
    if node is None:
        return
    if isinstance(node, str):
        out.append(f'set content of (text range of {target}) to {json.dumps(node, ensure_ascii=False)}')
        return
    f = fresh('f')
    extra = ''
    if 'args' in node and node['t'] in ('d', 'm', 'eqarr'):
        extra += f' number of arguments {len(node["args"])}'
    if 'cols' in node:
        extra += f' number of columns {node["cols"]}'
    out.append(f'set loc to create range doc start (start of content of (text range of {target})) end (start of content of (text range of {target}))')
    out.append(f'add math function {target} in location loc math function type {TYPES[node["t"]]}{extra}')
    out.append(f'set {f} to math function 1 of {target}')
    for key, value in node.get('props', {}).items():
        literal = json.dumps(value) if isinstance(value, str) else ('true' if value is True else 'false' if value is False else str(value))
        if isinstance(value, str) and value.startswith('@'):
            literal = value[1:]
        out.append(f'set {key} of ({OWNER[node["t"]]} of {f}) to {literal}')
    for index, arg in enumerate(node.get('args', []), start=1):
        a = fresh('a')
        out.append(f'set {a} to math object {index} of {f}')
        fill(a, arg, out)
    # Named arguments avoid relying on the positional order of limits, bases and scripts.
    for role, arg in node.get('named', {}).items():
        a = fresh('a')
        out.append(f'set {a} to {role} of ({OWNER[node["t"]]} of {f})')
        fill(a, arg, out)

def paragraph(segments, out, first):
    """Emits one paragraph: the whole text with a placeholder per equation, then equations right to left."""
    if not first:
        out.append('insert paragraph at end of text object of doc')
    text = ''.join(value if kind == 'text' else PLACEHOLDER for kind, value in segments)
    out.append('set pr to text object of (paragraph (count of paragraphs of doc) of doc)')
    out.append('set p0 to start of content of pr')
    out.append(f'insert text {json.dumps(text, ensure_ascii=False)} at (create range doc start p0 end p0)')
    offsets, cursor = [], 0
    for kind, value in segments:
        if kind == 'math':
            offsets.append((cursor, value))
            cursor += 1
        else:
            cursor += len(value.encode('utf-16-le')) // 2
    for offset, value in reversed(offsets):
        m = fresh('m')
        out.append(f'create new equation from range (create range doc start (p0 + {offset}) end (p0 + {offset + 1})) in document doc')
        out.append(f'set {m} to math object 1 of (create range doc start (p0 + {offset}) end (p0 + {offset + 1}))')
        root = value.get('root', value) if isinstance(value, dict) else value
        for key, prop in (value.get('equation', {}) if isinstance(value, dict) else {}).items():
            out.append(f'set {key} of {m} to {prop}')
        if isinstance(root, str):
            out.append(f'set content of (text range of {m}) to {json.dumps(root, ensure_ascii=False)}')
            continue
        fill(m, root, out)

def build_all(directory, fixtures):
    out = []
    for fixture in fixtures:
        path = directory + '/' + fixture['name'] + '.docx'
        out.append(f'set hfs to (POSIX file {json.dumps(path)}) as text')
        out.append('tell application "Microsoft Word"')
        out.append('set content of text object of doc to ""')
        for index, segments in enumerate(fixture['paragraphs']):
            paragraph(segments, out, index == 0)
        out.append('execute find (find object of text object of doc) find text "¤" replace with "" replace replace all')
        for key, value in (fixture.get('settings') or {}).items():
            out.append(f'try\nset {key} of doc to {value}\non error\nset skipped to skipped & {json.dumps(key)} & "; "\nend try')
        out.append('save as doc file name hfs file format format document')
        # Saving renames the document, which invalidates a name-based reference.
        out.append(f'set doc to document {json.dumps(fixture["name"] + ".docx")}')
        out.append('end tell')
    script = chr(10).join(['set skipped to ""', 'tell application "Microsoft Word" to set doc to make new document'] + out + ['return "ok; skipped: " & skipped'])
    open(directory + '/generate.applescript', 'w').write(script)
    result = subprocess.run(['osascript', directory + '/generate.applescript'], capture_output=True, text=True, timeout=900)
    return result.returncode, result.stdout + result.stderr

if __name__ == '__main__':
    spec = json.load(open(sys.argv[1]))
    print(build_all(spec['dir'], spec['fixtures']))
