import pkg from '#package.json' assert { type: 'json' }
import typescript from '@rollup/plugin-typescript'
import json from '@rollup/plugin-json'
import terser from '@rollup/plugin-terser'
import analyze from 'rollup-plugin-analyzer'

const external = Object.keys(pkg.dependencies).concat(['#package.json'])
const plugins = [typescript(), json()]

if (process.env.NODE_ENV === 'production') {
  plugins.push(terser())
}

plugins.push(analyze())

export default {
  input: 'src/main.ts',
  output: {
    file: 'dist/main.js',
    format: 'esm'
  },
  external,
  plugins
}
