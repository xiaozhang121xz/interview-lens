import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const textExtensions = new Set([
  '.cjs', '.css', '.env', '.example', '.html', '.js', '.json', '.jsx',
  '.md', '.mjs', '.prisma', '.sh', '.ts', '.tsx', '.txt', '.yaml', '.yml',
]);

const patterns = [
  ['private key', /BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY/],
  ['AWS access key', /A(?:K|S)IA[0-9A-Z]{16}/],
  ['GitHub token', /(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})/],
  ['OpenAI-style API key', /sk-[A-Za-z0-9_-]{20,}/],
  ['credentialed MongoDB URL', /mongodb(?:\+srv)?:\/\/[^\s:'"/]+:[^\s@'"/]+@/],
  ['credential embedded in URL', /[a-z][a-z0-9+.-]*:\/\/[^\s/@:'"]+:[^\s/@'"]+@/i],
];

function trackedFiles() {
  return execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { encoding: 'utf8' }
  )
    .split('\0')
    .filter(Boolean);
}

function extensionOf(file) {
  const index = file.lastIndexOf('.');
  return index >= 0 ? file.slice(index).toLowerCase() : '';
}

const findings = [];

for (const file of trackedFiles()) {
  if (file === 'scripts/security-scan.mjs' || !textExtensions.has(extensionOf(file))) {
    continue;
  }

  const content = readFileSync(file, 'utf8');
  for (const [label, pattern] of patterns) {
    if (pattern.test(content)) {
      findings.push(`${label}: ${file}`);
    }
  }
}

const authorEmails = execFileSync('git', ['log', '--format=%ae'], { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean);

for (const email of authorEmails) {
  if (!email.endsWith('@users.noreply.github.com')) {
    findings.push('non-noreply Git author email found in repository history');
    break;
  }
}

if (findings.length > 0) {
  console.error('Security scan failed:');
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log('Security scan passed: no committed high-confidence secrets or personal Git author email found.');
