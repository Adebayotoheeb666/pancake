const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      results.push(file);
    }
  });
  return results;
}

describe('Repository sanity checks', () => {
  test('no remaining sharaebleId misspelling', () => {
    const root = path.resolve(__dirname, '../../');
    const files = walk(root).filter(f => f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx'));

    const matches = [];
    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('sharaebleId')) matches.push(file);
    });

    if (matches.length > 0) {
      throw new Error('Found files with misspelling "sharaebleId":\n' + matches.join('\n'));
    }
  });
});
