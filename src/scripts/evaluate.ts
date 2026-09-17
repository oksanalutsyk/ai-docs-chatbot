import 'dotenv/config';
import { askWithRAG } from '../services/ragService';
import type { Message, EvalResult } from '../types';
import { TEST_CASES, CONVERSATION_TEST } from './testCases';
import { closeConnection } from '../services/vectorStore';

function checkKeywords(answer: string, keywords: string[]): { found: string[]; missed: string[] } {
  const lowerAnswer = answer.toLowerCase();
  const found = keywords.filter((kw) => lowerAnswer.includes(kw.toLowerCase()));
  const missed = keywords.filter((kw) => !lowerAnswer.includes(kw.toLowerCase()));
  return { found, missed };
}

function printSeparator(char = '─', length = 60) {
  console.log(char.repeat(length));
}

async function runStandaloneTests(): Promise<EvalResult[]> {
  console.log('\n📋 STANDALONE QUESTION TESTS');
  printSeparator('═');

  const results: EvalResult[] = [];

  for (let i = 0; i < TEST_CASES.length; i++) {
    const testCase = TEST_CASES[i];
    console.log(`\n[${i + 1}/${TEST_CASES.length}] ${testCase.question}`);
    printSeparator();

    try {
      const { answer, sources } = await askWithRAG(testCase.question, []);

      const topScore = sources.length > 0 ? parseFloat(sources[0].score) : 0;
      const { found, missed } = checkKeywords(answer, testCase.expectedKeywords);
      const passed =
        topScore >= 0.7 && found.length >= Math.ceil(testCase.expectedKeywords.length * 0.5);

      const result: EvalResult = {
        question: testCase.question,
        answer,
        sources,
        topScore,
        keywordsFound: found,
        keywordsMissed: missed,
        passed,
      };

      results.push(result);

      console.log(`📊 Top similarity score: ${topScore.toFixed(3)} ${topScore >= 0.7 ? '✅' : '⚠️ '}`);
      console.log(
        `🔑 Keywords found: ${found.length}/${testCase.expectedKeywords.length} [${found.join(', ')}]`
      );
      if (missed.length > 0) {
        console.log(`   Keywords missed: [${missed.join(', ')}]`);
      }
      console.log(`📚 Sources (${sources.length}):`);
      sources.slice(0, 3).forEach((s) => console.log(`   • ${s.source} (${s.score})`));
      console.log(`💬 Answer preview: ${answer.slice(0, 150)}...`);
      console.log(`\n${passed ? '✅ PASSED' : '❌ FAILED'}`);
    } catch (error) {
      console.error(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      results.push({
        question: testCase.question,
        answer: '',
        sources: [],
        topScore: 0,
        keywordsFound: [],
        keywordsMissed: testCase.expectedKeywords,
        passed: false,
      });
    }
  }

  return results;
}

async function runConversationTest(): Promise<void> {
  console.log('\n\n💬 CONVERSATION CONTINUITY TEST');
  printSeparator('═');
  console.log('Testing query reformulation across a multi-turn conversation\n');

  const history: Message[] = [];

  for (let i = 0; i < CONVERSATION_TEST.length; i++) {
    const turn = CONVERSATION_TEST[i];
    console.log(`[Turn ${i + 1}] User: "${turn.question}"`);

    try {
      const { answer, sources } = await askWithRAG(turn.question, history);
      const topScore = sources.length > 0 ? parseFloat(sources[0].score) : 0;
      const { found } = checkKeywords(answer, turn.expectedKeywords);

      console.log(
        `         Score: ${topScore.toFixed(3)} | Keywords: ${found.length}/${turn.expectedKeywords.length}`
      );
      console.log(`         Answer: ${answer.slice(0, 100)}...\n`);

      history.push(
        { role: 'user', content: turn.question },
        { role: 'assistant', content: answer }
      );
    } catch (error) {
      console.error(
        `❌ Error on turn ${i + 1}: ${error instanceof Error ? error.message : 'Unknown'}`
      );
    }
  }
}

function printSummary(results: EvalResult[]): void {
  console.log('\n\n📈 EVALUATION SUMMARY');
  printSeparator('═');

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const avgScore = results.reduce((sum, r) => sum + r.topScore, 0) / total;
  const passRate = (passed / total) * 100;

  console.log(`\nTotal tests:     ${total}`);
  console.log(`Passed:          ${passed}/${total} (${passRate.toFixed(0)}%)`);
  console.log(`Avg top score:   ${avgScore.toFixed(3)}`);
  console.log(`Min score:       ${Math.min(...results.map((r) => r.topScore)).toFixed(3)}`);
  console.log(`Max score:       ${Math.max(...results.map((r) => r.topScore)).toFixed(3)}`);

  console.log('\nPer-question results:');
  results.forEach((r, i) => {
    const status = r.passed ? '✅' : '❌';
    console.log(
      `  ${status} [${i + 1}] ${r.question.slice(0, 50)}... | score: ${r.topScore.toFixed(3)}`
    );
  });

  console.log('\n🎯 RATING:');
  if (passRate >= 80 && avgScore >= 0.75) {
    console.log('  🌟 EXCELLENT — Production-ready RAG quality');
  } else if (passRate >= 60 && avgScore >= 0.65) {
    console.log('  ✅ GOOD — Strong retrieval, minor gaps');
  } else if (passRate >= 40 && avgScore >= 0.55) {
    console.log('  ⚠️  FAIR — Consider expanding document corpus');
  } else {
    console.log('  ❌ NEEDS IMPROVEMENT — Low relevance scores');
  }
  printSeparator('═');
}

async function main() {
  console.log('🧪 RAG EVALUATION SCRIPT');
  console.log('Testing retrieval quality and answer relevance\n');

  const standaloneResults = await runStandaloneTests();
  await runConversationTest();
  printSummary(standaloneResults);

  await closeConnection();
}

main().catch(console.error);
