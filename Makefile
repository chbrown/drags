all: static/compiled.js static/site.css

VENDOR = underscore jquery backbone jquery-flags cookies moment handlebars.runtime
SCRIPTS = $(VENDOR:%=static/lib/%.js)

static/compiled.js: $(SCRIPTS)
	closure-compiler --language_in ECMASCRIPT5 --warning_level QUIET --js $(SCRIPTS) > $@

static/site.css: static/site.less
	lessc static/site.less | cleancss --keep-line-breaks --skip-advanced -o $@
