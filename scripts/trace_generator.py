#!/usr/bin/env python3
"""Generate execution traces for Python code using sys.settrace."""

import ast
import json
import sys
import re
import io
import contextlib

# Global storage for trace
trace_data = []
current_locals = {}

class TraceRunner(ast.NodeVisitor):
    """AST visitor to identify key lines for tracing."""

    def __init__(self):
        self.tracked_vars = set()
        self.for_loops = []
        self.if_statements = []

    def visit_For(self, node):
        self.for_loops.append(node.lineno)
        self.generic_visit(node)

    def visit_If(self, node):
        self.if_statements.append(node.lineno)
        self.generic_visit(node)

    def visit_Assign(self, node):
        for target in node.targets:
            if isinstance(target, ast.Name):
                self.tracked_vars.add(target.id)
        self.generic_visit(node)

    def visit_Call(self, node):
        if isinstance(node.func, ast.Attribute):
            self.tracked_vars.add('self')
        self.generic_visit(node)

def get_sample_input(problem_id, title):
    """Get sample input based on problem type."""
    title_lower = title.lower()

    if 'two sum' in title_lower:
        return {"nums": [2, 7, 11, 15], "target": 9}
    elif 'contains duplicate' in title_lower:
        return {"nums": [1, 2, 3, 1]}
    elif 'valid anagram' in title_lower:
        return {"s": "anagram", "t": "nagaram"}
    elif 'group anagrams' in title_lower:
        return {"strs": ["eat", "tea", "tan", "ate", "nat", "bat"]}
    elif 'top k frequent' in title_lower:
        return {"nums": [1, 1, 1, 2, 2, 3], "k": 2}
    elif 'encode and decode' in title_lower:
        return {"strs": ["hello", "world"]}
    elif 'product of array' in title_lower:
        return {"nums": [1, 2, 3, 4]}
    elif 'valid sudoku' in title_lower:
        return {"board": [
            ["5","3",".",".","7",".",".",".","."],
            ["6",".",".","1","9","5",".",".","."],
            [".","9","8",".",".",".",".","6","."],
            ["8",".",".",".","6",".",".",".","3"],
            ["4",".",".","8",".","3",".",".","1"],
            ["7",".",".",".","2",".",".",".","6"],
            [".","6",".",".",".",".","2","8","."],
            [".",".",".","4","1","9",".",".","5"],
            [".",".",".",".","8",".",".","7","9"]
        ]}
    elif 'longest consecutive' in title_lower:
        return {"nums": [100, 4, 200, 1, 3, 2]}
    elif 'valid palindrome' in title_lower:
        return {"s": "A man, a plan, a canal: Panama"}
    elif 'reverse integer' in title_lower:
        return {"x": 123}
    elif 'string to integer' in title_lower:
        return {"s": "42"}
    elif 'container with most water' in title_lower:
        return {"height": [1, 8, 6, 2, 5, 4, 8, 3, 7]}
    elif '3sum' in title_lower:
        return {"nums": [-1, 0, 1, 2, -1, -4]}
    elif '3sum closest' in title_lower:
        return {"nums": [-1, 2, 1, -4], "target": 1}
    elif 'longest substring without repeating' in title_lower:
        return {"s": "abcabcbb"}
    elif 'subarray sum equals k' in title_lower:
        return {"nums": [1, 1, 1], "k": 2}
    elif 'permutation in string' in title_lower:
        return {"s1": "ab", "s2": "eidbaooo"}
    elif 'rotate image' in title_lower:
        return {"matrix": [[1,2,3],[4,5,6],[7,8,9]]}
    elif 'spiral matrix' in title_lower:
        return {"matrix": [[1,2,3],[4,5,6],[7,8,9]]}
    elif 'set matrix zeros' in title_lower:
        return {"matrix": [[1,1,1],[1,0,1],[1,1,1]]}
    elif 'jump game' in title_lower:
        return {"nums": [2, 3, 1, 1, 4]}
    elif 'climbing stairs' in title_lower:
        return {"n": 5}
    elif 'best time to buy and sell stock' in title_lower:
        return {"prices": [7, 1, 5, 3, 6, 4]}
    elif 'minimum path sum' in title_lower:
        return {"grid": [[1,2,3],[4,5,6]]}
    elif 'coin change' in title_lower:
        return {"coins": [1, 2, 5], "amount": 11}
    elif 'longest increasing subsequence' in title_lower:
        return {"nums": [10, 9, 2, 5, 3, 7, 101, 18]}
    elif 'word break' in title_lower:
        return {"s": "leetcode", "wordDict": ["leet", "code"]}
    elif 'house robber' in title_lower:
        return {"nums": [1, 2, 3, 1]}
    elif 'decode ways' in title_lower:
        return {"s": "226"}
    elif 'unique paths' in title_lower:
        return {"m": 3, "n": 7}
    elif 'longest common subsequence' in title_lower:
        return {"text1": "abcde", "text2": "ace"}
    elif 'edit distance' in title_lower:
        return {"word1": "horse", "word2": "ros"}
    elif 'find town judge' in title_lower:
        return {"n": 2, "trust": [[1,2]]}
    elif 'number of islands' in title_lower:
        return {"grid": [
            ["1","1","1","1","0"],
            ["1","1","0","1","0"],
            ["1","1","0","0","0"],
            ["0","0","0","0","0"]
        ]}
    elif 'clone graph' in title_lower:
        return {"adjList": [[1,2],[2,3],[3,4],[4,5]]}
    elif 'pacific atlantic' in title_lower:
        return {"heights": [[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,3,4],[5,1,1,1,4]]}
    elif 'invert binary tree' in title_lower:
        return {"root": [4,2,7,1,3,6,9]}
    elif 'diameter of binary tree' in title_lower:
        return {"root": [1,2,3,4,5]}
    elif 'lowest common ancestor' in title_lower:
        return {"root": [3,5,1,6,2,0,8], "p": 5, "q": 1}
    elif 'validate bst' in title_lower:
        return {"root": [2,1,3]}
    elif 'max depth' in title_lower:
        return {"root": [3,9,20,None,None,15,7]}
    elif 'serialize and deserialize' in title_lower:
        return {"root": [1,2,3,None,None,4,5]}
    elif 'subtree of another tree' in title_lower:
        return {"root": [3,4,5,1,2], "subRoot": [4,1,2]}
    elif 'construct binary tree' in title_lower and 'array' in title_lower:
        return {"nums": [2,3,1,1,2], "k": 4}
    elif 'sliding window maximum' in title_lower:
        return {"nums": [1,-1], "k": 1}
    elif 'first negative number' in title_lower:
        return {"nums": [12,-1,-7,8,-15,30,16,28], "k": 3}
    elif 'frequency equals' in title_lower:
        return {"s": "ab", "t": "ba"}
    elif 'maximum sum subarray' in title_lower:
        return {"nums": [-2,1,-3,4,-1,2,1,-5,4]}
    elif 'linked list cycle' in title_lower:
        return {"head": [3,2,0,-4], "pos": 1}
    elif 'merge two sorted lists' in title_lower:
        return {"list1": [1,2,4], "list2": [1,3,4]}
    elif 'reverse linked list' in title_lower:
        return {"head": [1,2,3,4,5]}
    elif 'lru cache' in title_lower:
        return {"capacity": 2}
    elif 'merge k sorted lists' in title_lower:
        return {"lists": [[1,4,5],[1,3,4],[2,6]]}
    elif 'trapping rain water' in title_lower:
        return {"height": [0,1,0,2,1,0,1,3,2,1,2,1]}
    elif 'sort colors' in title_lower:
        return {"nums": [2,0,2,1,1,0]}
    elif 'shortest path' in title_lower and 'matrix' in title_lower:
        return {"grid": [[0,1],[1,0]]}
    elif 'longest palindromic substring' in title_lower:
        return {"s": "babad"}
    elif 'regular expression' in title_lower or 'regex' in title_lower:
        return {"s": "aa", "p": "a*"}
    elif 'integer to roman' in title_lower:
        return {"num": 3}
    elif 'roman to integer' in title_lower:
        return {"s": "III"}
    elif 'longest common prefix' in title_lower:
        return {"strs": ["flower","flow","flight"]}
    elif 'valid parentheses' in title_lower:
        return {"s": "()[]{}"}
    elif 'remove duplicates' in title_lower and 'sorted' in title_lower:
        return {"nums": [1,1,2]}
    elif 'remove element' in title_lower:
        return {"nums": [3,2,2,3], "val": 3}
    elif 'search insert position' in title_lower:
        return {"nums": [1,3,5,6], "target": 5}
    elif 'maximum product subarray' in title_lower:
        return {"nums": [2,3,-2,4]}
    elif 'find minimum in rotated sorted array' in title_lower:
        return {"nums": [3,4,5,1,2]}
    elif 'search in rotated sorted array' in title_lower:
        return {"nums": [4,5,6,7,0,1,2], "target": 0}
    elif 'median of two sorted arrays' in title_lower:
        return {"nums1": [1,3], "nums2": [2]}
    else:
        return {"nums": [1, 2, 3]}

def extract_function_and_class(code):
    """Extract function/method name and class name from code."""
    class_match = re.search(r'class\s+(\w+)', code)
    func_match = re.search(r'def\s+(\w+)\s*\(', code)

    class_name = class_match.group(1) if class_match else "Solution"
    func_name = func_match.group(1) if func_match else "solution"

    return class_name, func_name

def create_traced_code(code, inputs):
    """Wrap code with tracing functionality."""
    class_name, func_name = extract_function_and_class(code)

    # Convert inputs to keyword arguments
    input_kwargs = ", ".join(f"{k}={json.dumps(v)}" for k, v in inputs.items())

    traced_code = f'''
import sys
import json

{code}

def run_with_trace():
    sol = {class_name}()
    func = getattr(sol, '{func_name}')

    # Capture initial state
    initial = {json.dumps(inputs)}
    result = func({input_kwargs})

    print(json.dumps({{
        "initial_state": initial,
        "result": str(result)
    }}))
    return result

if __name__ == "__main__":
    run_with_trace()
'''
    return traced_code

def run_code(code, inputs):
    """Execute code and capture output."""
    traced_code = create_traced_code(code, inputs)

    # Capture stdout
    old_stdout = sys.stdout
    sys.stdout = captured = io.StringIO()

    try:
        exec(traced_code, {})
    except Exception as e:
        captured.write(json.dumps({"error": str(e)}))

    sys.stdout = old_stdout
    return captured.getvalue()

def generate_trace(problem_id, title, code):
    """Generate execution trace for a problem."""
    inputs = get_sample_input(problem_id, title)

    # Parse code to find key lines
    try:
        tree = ast.parse(code)
    except:
        return None

    runner = TraceRunner()
    runner.visit(tree)

    # Run code to get actual values
    output = run_code(code, inputs)

    # Parse output
    try:
        result_data = json.loads(output) if output.strip() else {}
    except:
        result_data = {"raw": output[:500]}

    # Generate trace steps based on code structure
    lines = code.strip().split('\n')
    steps = []

    # State variables we'll track
    state = dict(inputs)

    for i, line in enumerate(lines, 1):
        stripped = line.strip()

        # Skip empty lines and comments
        if not stripped or stripped.startswith('#'):
            continue

        # Build state snapshot
        step_state = {}

        # Add input variables
        for k, v in inputs.items():
            if k in line:
                step_state[k] = v

        # Try to identify variable assignments
        if '=' in line and '==' not in line and '!=' not in line and 'def ' not in line:
            # Simple variable tracking
            parts = line.split('=')
            if len(parts) == 2:
                var = parts[0].strip().split()[-1]
                if var and not var.startswith('['):
                    step_state[var] = "<value>"

        # Identify loops and their variables
        if 'for ' in line:
            # Extract loop variable
            for_match = re.search(r'for\s+(\w+)\s+in', line)
            if for_match:
                step_state[for_match.group(1)] = "<iter>"

        # Identify function parameters
        if 'def ' in line:
            params = re.findall(r'(\w+):', line)
            for p in params:
                if p != 'self' and p != 'return':
                    step_state[p] = inputs.get(p, "<param>")

        steps.append({
            "line": i,
            "state": step_state if step_state else state.copy(),
            "code": stripped
        })

    return {
        "problemId": problem_id,
        "title": title,
        "code": code,
        "steps": steps[:20]  # Limit steps
    }

if __name__ == "__main__":
    problem_id = int(sys.argv[1]) if len(sys.argv) > 1 else 3

    with open("src/data/problems_with_code.json", "r") as f:
        problems = json.load(f)

    if str(problem_id) in problems:
        p = problems[str(problem_id)]
        result = generate_trace(problem_id, p['title'], p['code'])
        print(json.dumps(result, indent=2))
    else:
        print(json.dumps({"error": f"Problem {problem_id} not found"}))