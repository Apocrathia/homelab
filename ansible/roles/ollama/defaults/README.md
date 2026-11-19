# defaults: ollama role variables

`main.yml` holds two variables: `ollama_version` ("latest" tracks GitHub
releases via the nightly drift job; a bare version pins or rolls back) and the
official installer URL. The installer owns the whole install; the role never
templates it.

> **Navigation**: [← Back to ollama README](../README.md)
