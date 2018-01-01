const gulp = require('gulp');
const clean = require('gulp-clean');
const sass = require('gulp-sass');
const rollup = require('rollup-stream');
const resolve = require('rollup-plugin-node-resolve');
const builtins = require('rollup-plugin-node-builtins');
const commonjs = require('rollup-plugin-commonjs');
const source = require('vinyl-source-stream');

// Distribution directory name
const dist = './dist';
const scriptList = [
  './src/background_scripts/background.js',
  './src/browser_actions/browser-action.js',
  './src/options_ui/options.js',
  './src/content_scripts/mangafox.js',
  './src/content_scripts/mangaeden.js',
  './src/content_scripts/mangahere.js',
];


// SASS compiler
// //////////////////////////////////////////////////////////////////////

gulp.task('sass', () => {
  gulp.src('./src/sass/**/*.scss')
    .pipe(sass({ outputStyle: 'compressed' }).on('error', sass.logError))
    .pipe(gulp.dest(`${dist}/css`));
});

gulp.task('sass:watch', () => {
  gulp.watch('./src/sass/**/*.scss', ['sass']);
});

// JS transpilation
// //////////////////////////////////////////////////////////////////////

gulp.task('copyStaticContent', () => {
  gulp.src('./static/**')
    .pipe(gulp.dest(dist));

  gulp.src('./node_modules/open-iconic/font/fonts/**')
    .pipe(gulp.dest(`${dist}/fonts`));
});

gulp.task('copyStaticContent:watch', () => {
  gulp.watch('./static/**', ['copyStaticContent']);
});

// JS transpilation
// //////////////////////////////////////////////////////////////////////

let rollupCache;
const taskList = [];

scriptList.forEach((path) => {
  const parts = path.split('/');
  taskList.push(`build-${parts[parts.length - 1]}`);

  gulp.task(`build-${parts[parts.length - 1]}`, () => {
    rollup({
      input: path,
      format: 'es',
      // exports: 'none',
      plugins: [
        resolve(),
        commonjs(),
        builtins(),
      ],
      cache: rollupCache,
    })
      .on('unifiedcache', (unifiedCache) => {
        rollupCache = unifiedCache;
      })
      .pipe(source(parts[parts.length - 1]))
      .pipe(gulp.dest(`${dist}/${parts[parts.length - 2]}`));
  });
});

gulp.task('js:watch', () => {
  gulp.watch('./src/**/*.js', taskList);
});

// Main tasks
// //////////////////////////////////////////////////////////////////////

gulp.task('default', ['build']);

gulp.task('build', ['copyStaticContent', 'sass'].concat(taskList));

gulp.task('watch', ['copyStaticContent:watch', 'sass:watch', 'js:watch']);

gulp.task('clean', () => {
  gulp
    .src('dist/', { read: false })
    .pipe(clean());
});
