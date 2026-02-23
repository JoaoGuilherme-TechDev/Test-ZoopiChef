
const fs = require('fs');
const path = require('path');

const directory = path.join(__dirname, '../src');
const shimPath = '@/lib/supabase-shim';

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walk(filePath);
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        processFile(filePath);
      }
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  // Regex to match the import with flexible spacing and quotes
  const regex = /import\s+\{\s*supabase\s*\}\s+from\s+['"]@\/integrations\/supabase\/client['"];?/g;
  
  if (regex.test(content)) {
    console.log(`Processing: ${filePath}`);
    const newContent = content.replace(regex, `import { supabase } from '${shimPath}';`);
    fs.writeFileSync(filePath, newContent, 'utf8');
  }
}

console.log('Starting migration...');
walk(directory);
console.log('Migration complete.');
