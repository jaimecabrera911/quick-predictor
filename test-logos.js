const fs = require('fs');
const content = fs.readFileSync('./src/utils/logos.ts', 'utf8');

// Find the COUNTRY_CODES definition
const match = content.match(/const COUNTRY_CODES: Record<string, string> = \{([\s\S]*?)\};/);
if (match) {
  const body = match[1];
  const lines = body.split('\n');
  for (const line of lines) {
    if (line.includes('south africa') || line.includes('south korea') || line.includes('czechia') || line.includes('usa') || line.includes('paraguay')) {
      console.log("Line:", JSON.stringify(line));
      const charCodes = [];
      for (let i = 0; i < line.length; i++) {
        charCodes.push(line.charCodeAt(i));
      }
      console.log("Codes:", charCodes.join(','));
    }
  }
} else {
  console.log("COUNTRY_CODES not found");
}
