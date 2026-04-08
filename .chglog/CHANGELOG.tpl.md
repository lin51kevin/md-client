# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

{{range .Versions}}
## [{{.Tag.Name}}] - {{.Tag.Date.Format "2006-01-02"}}

{{range .CommitGroups}}
### {{.Title}}

{{range .Commits}}- {{.Subject}} (`{{.Hash.Short}}`)
{{end}}

{{end}}

{{range .NoteGroups}}
### {{.Title}}

{{range .Notes}}
- {{.Body}}
{{end}}

{{end}}

{{end}}
