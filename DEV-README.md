to generate dist files: `yarn compile`
to run tests: `yarn test`

regex101.com is great for developing the regexes

avoid backtracking (match as little as possible, but not too little)

# How to do release
- `yarn compile`
- `yarn publish` (updates version in `package.json` and creates a tag & commit)
- `git push --tags`
- make release in GitHub
- update demopage to use the new release
- (measure gzipped size at https://terser-playground.surge.sh/)

# TODO:
- VS Code extension (syntax highlighting)
- Split parser/emitter/CLI into smaller packages?
- Emitter option to disable rendering raw html nodes (untrusted content)

# Links:
- https://en.wikipedia.org/wiki/Lightweight_markup_language
- https://arcticicestudio.github.io/styleguide-markdown/rules/code.html
