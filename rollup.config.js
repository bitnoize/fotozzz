import pkg from '#package.json' assert { type: 'json' }
import typescript from '@rollup/plugin-typescript'
import json from '@rollup/plugin-json'
import terser from '@rollup/plugin-terser'

const external = Object
  .keys(pkg.dependencies)
  .concat(['#package.json', 'telegraf/filters'])
const plugins = [typescript(), json()]

if (process.env.NODE_ENV === 'production') {
  plugins.push(terser())
}

export default {
  input: 'src/main.ts',
  output: {
    file: 'dist/main.js',
    format: 'esm'
  },
  external,
  plugins
}
