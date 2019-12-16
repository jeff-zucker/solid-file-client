- changes
	- libraries
		- rdflib is not used anymore
			- related function fetchAndParse() is discarded 
		- solid-auth... :
			- for browser : solid-auth-client is not included and must be added <script src="https://cdn.jsdelivr.net/npm/solid-auth-client@2.3.0/dist-lib/solid-auth-client.bundle.js"></script>
			- for node.js/console : use solid-auth-cli
			- session functions are discarded 
			- see examples in !!sessionUtils
				checkSession return webId || undefined (used to be session Object || false)
	- other functions :
		- fc.update() is discarded, replaced by fc.putFile()
		- fc.fetch do not return body
			var response = await fc.fetch(thing.url, { headers: { "Accept": "text/turtle" }})
			if(!response.ok){ self.err=fc.err; return false }
			var body = await response.text()
		- fc.guessFileType is discarded, if needed can be replaced :
			- in browser with window.Mimer
				<script src="https://cdn.jsdelivr.net/npm/mimer@1.0.0/dist/mimer.min.js"></script>
			- in node.js/console : npm mime-types
			- contentType is needed
		- fc.readFolder()
			- no folder.content (access body from fc.fetch(folderUrl)))
			- no files.label (file.label = decodeURIComponent(f.name))
