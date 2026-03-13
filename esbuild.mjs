import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

/** @type {esbuild.BuildOptions} */
const serverConfig = {
  entryPoints: ['server/src/server.ts'],
  bundle: true,
  outdir: 'out/server/src',
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  external: ['vscode'],
  mainFields: ['module', 'main'],
  tsconfig: 'tsconfig.json',
};

/** @type {esbuild.BuildOptions} */
const clientConfig = {
  entryPoints: ['client/src/extension.ts'],
  bundle: true,
  outdir: 'out/client/src',
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  external: ['vscode'],
  tsconfig: 'tsconfig.json',
};

async function build() {
  if (isWatch) {
    const serverCtx = await esbuild.context(serverConfig);
    const clientCtx = await esbuild.context(clientConfig);
    await Promise.all([serverCtx.watch(), clientCtx.watch()]);
    console.log('Watching for changes...');
  } else {
    await Promise.all([
      esbuild.build(serverConfig),
      esbuild.build(clientConfig),
    ]);
    console.log('Build complete.');
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
