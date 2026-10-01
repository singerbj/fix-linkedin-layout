import { build, context } from 'esbuild';
import { cpSync, mkdirSync, rmSync } from 'node:fs';

const watch = process.argv.includes('--watch');
const outdir = 'dist';

rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });
for (const f of ['manifest.json', 'src/content.css', 'src/popup.html']) {
  cpSync(f, `${outdir}/${f.split('/').pop()}`);
}
cpSync('icons', `${outdir}/icons`, { recursive: true });

const options = {
  entryPoints: ['src/content.ts', 'src/popup.ts'],
  outdir,
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  logLevel: 'info',
};

if (watch) {
  await (await context(options)).watch();
} else {
  await build(options);
}
