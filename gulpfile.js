var gulp = require('gulp');
var babel = require('gulp-babel');

gulp.task('default', function () {
  return gulp.src([ 'lib/**' ])
    .pipe(babel({"presets": ["es2015-node"]}))
    .pipe(gulp.dest('dist'));
});
