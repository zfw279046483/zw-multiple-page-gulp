const { src, dest, series, parallel, watch } = require('gulp')

const del = require('del')

const plugins = require('gulp-load-plugins')()
const sass = plugins.sass(require('sass'))

const bs = require('browser-sync').create()
const cwd = process.cwd()

const config = {
  build: {
    src: 'src',
    dist: 'dist',
    temp: '.temp',
    public: 'public',
    htmlFolder: '/zhtml',
    paths: {
      style: 'assets/**/*.scss',
      script: 'assets/**/*.js',
      html: 'zhtml/**',
      ignoreHtml: '!zhtml/layout/**',
      images: 'assets/**/images/**',
      font: 'assets/font/**',
    }
  }
}

try {
  const loadConfig = require(`${cwd}/pages.config.js`)
  config = Object.assign({}, config)
} catch(e) {}

const clean = () => {
  return del([config.build.dist, config.build.temp])
}


const style = () => {
  return src(config.build.paths.style, { base: config.build.src, cwd: config.build.src })
          .pipe(sass({ outputStyle: 'expanded' }))
          .pipe(dest(config.build.temp))
}


const script = () => {
  return src(config.build.paths.script, { base: config.build.src, cwd: config.build.src })
          .pipe(plugins.babel({
            presets: [require('@babel/preset-env')]
          }))
          .pipe(dest(config.build.temp))
}


const html = () => {
  return src(
            [config.build.paths.html, config.build.paths.ignoreHtml], {
            base: `${config.build.src}${config.build.htmlFolder}`,
            cwd: config.build.src
          })
          .pipe(plugins.fileInclude({
            prefix: '@@',
            basepath: '@file'
          }))
          .pipe(dest(config.build.temp))
}

const useref = () => {
  return src('**/*.html', { base: config.build.temp, cwd: config.build.temp })
          .pipe(plugins.useref({ searchPath: [config.build.temp, '.'] }))
          .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
          .pipe(plugins.if(/\.js$/, plugins.uglify()))
          .pipe(plugins.if(/\.html$/, plugins.htmlmin({
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: true
          })))
          .pipe(dest(config.build.dist))
}

const images = () => {
  return src(config.build.paths.images, { base: config.build.src, cwd: config.build.src })
          .pipe(plugins.imagemin())
          .pipe(dest(config.build.dist))
}

const font = () => {
  return src(config.build.paths.font, { base: config.build.src, cwd: config.build.src })
          .pipe(plugins.imagemin())
          .pipe(dest(config.build.dist))
}

const extra = () => {
  return src('**', { base: config.build.public, cwd: config.build.public })
          .pipe(dest(config.build.dist))
}

const serve = () => {
  const fetch = (path, cwd, task) => {
    watch(path, { cwd }, task).on('change', bs.reload)
  }
  fetch(config.build.paths.style, config.build.src, style)
  fetch(config.build.paths.script, config.build.src, script)
  fetch(config.build.paths.html, config.build.src, html)
  fetch([
    config.build.paths.images,
    config.build.paths.font
  ], config.build.src)
  fetch('**', config.build.public)

  bs.init({
    notify: false,
    open: false,
    server: {
      baseDir: [config.build.temp, config.build.src, config.build.public],
      routes: {
        '/node_modules': 'node_modules'
      }
    },
  })
}

// images, font, extra
const compile = parallel(style, script, html)
const dev = series(clean, compile, serve)
const build = series(clean, parallel(series(compile, useref), images, font, extra))

module.exports = {
  dev,
  build,
  clean
}