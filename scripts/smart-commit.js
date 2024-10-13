import { execSync } from 'child_process';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import readline from 'readline';

dotenv.config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Fonction pour obtenir le diff
function getDiff() {
  return execSync('git diff --cached').toString();
}

// Fonction pour générer un message de commit en utilisant Claude 3.5 Sonnet via l'API Anthropic
async function generateCommitMessage(diff) {
  const prompt = `@Commit (Diff of Working State)
${diff}
generate commit message depending on "Diff of Working State"`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2)); // Afficher la réponse complète pour le débogage

    if (data.content && Array.isArray(data.content) && data.content.length > 0) {
      return data.content[0].text;
    } else {
      console.error('Unexpected API response structure:', data);
      return "Erreur: Structure de réponse inattendue de l'API.";
    }
  } catch (error) {
    console.error('Erreur lors de la génération du message de commit:', error);
    return "Erreur: Impossible de générer un message de commit automatiquement.";
  }
}

// Fonction principale
async function main() {
  const diff = getDiff();
  const generatedMessage = await generateCommitMessage(diff);

  console.log("Suggested commit message:", generatedMessage);
  console.log("Press Enter to use this message or type a new one:");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('', (answer) => {
    const finalMessage = answer.trim() || generatedMessage;
    execSync(`git commit -m "${finalMessage}"`, { stdio: 'inherit' });
    rl.close();
  });
}

main().catch(console.error);
