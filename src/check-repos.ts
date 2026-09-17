import 'dotenv/config';
import axios from 'axios';

async function main() {
  console.log('=== anthropics/anthropic-cookbook ===');
  const { data: anthropic } = await axios.get(
    'https://api.github.com/repos/anthropics/anthropic-cookbook/contents'
  );
  anthropic.forEach((f: any) => console.log(f.type, f.name));

  console.log('\n=== openai/openai-cookbook ===');
  const { data: openai } = await axios.get(
    'https://api.github.com/repos/openai/openai-cookbook/contents'
  );
  openai.forEach((f: any) => console.log(f.type, f.name));
}

main().catch(console.error);