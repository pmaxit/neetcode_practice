const generatePracticeScaffold = (code, hints) => {
    if (!code) return '# No solution available yet.';
    
    const lines = code.split('\n');
    let scaffold = [];
    let foundMainFunction = false;
    let signaturePending = false;

    for (let line of lines) {
      const trimmed = line.trim();
      
      // Keep imports, class definitions, and function headers
      if (trimmed.startsWith('import ') || trimmed.startsWith('from ') || 
          trimmed.startsWith('class ') || trimmed.startsWith('def ')) {
        scaffold.push(line);
        if (trimmed.startsWith('def ')) foundMainFunction = true;
        if (!trimmed.endsWith(':')) signaturePending = true;
        continue;
      }

      // Keep lines that are part of a multiline signature
      if (signaturePending) {
        scaffold.push(line);
        if (trimmed.endsWith(':')) signaturePending = false;
        continue;
      }

      // Once we've found the main function and finished its signature, 
      // we stop adding implementation logic and add hints/placeholders instead.
      if (foundMainFunction && !signaturePending) {
        // Add a gap and then the hints
        scaffold.push('');
        if (hints) {
          const hintLines = hints.split('\n').map(h => `    # ${h.trim()}`);
          scaffold.push('    # GUIDED HINTS:');
          scaffold.push(...hintLines);
        }
        scaffold.push('');
        scaffold.push('    # TODO: Implement your logic here');
        scaffold.push('    pass');
        break; // We only scaffold the first function usually for LeetCode
      } else if (!foundMainFunction) {
        // Keep everything before the first function (docstrings, constants etc)
        scaffold.push(line);
      }
    }

    return scaffold.join('\n');
  };

const testCode = `import collections

class Solution:
    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:
        ans = collections.defaultdict(list)
        for s in strs:
            count = [0] * 26
            for c in s:
                count[ord(c) - ord('a')] += 1
            ans[tuple(count)].append(s)
        return ans.values()`;

const testHints = `1. Use a hash map to store anagram groups.
2. For each string, create a character count frequency array.
3. Use this array as the key in the hash map.`;

console.log(generatePracticeScaffold(testCode, testHints));
