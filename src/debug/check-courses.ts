import axios from 'axios';

async function checkFolder(folder: string) {
  const { data } = await axios.get(`https://api.github.com/repos/anthropics/courses/contents/${folder}`);
  const items = data.filter((f: any) => f.name.endsWith('.md') || f.type === 'dir');
  console.log(`\n📁 ${folder}:`);
  items.forEach((f: any) => console.log(`  ${f.type}: ${f.name}`));
}

async function main() {
  await checkFolder('prompt_engineering_interactive_tutorial/Anthropic 1P');
}

main();