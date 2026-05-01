PHONY: install

install:
	mkdir -p ~/.pi/agent/extensions
	ln -sf ${PWD}/webserp.ts ~/.pi/agent/extensions/webserp.ts
