all: static/compiled.js

VENDOR = json2 underscore jquery backbone jquery-flags cookies moment handlebars.runtime
SCRIPTS = $(VENDOR:%=static/lib/%.js)

static/compiled.js: $(SCRIPTS)
	closure-compiler --language_in ECMASCRIPT5 --warning_level QUIET --js $(SCRIPTS) > $@
