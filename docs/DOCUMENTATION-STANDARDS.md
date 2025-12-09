# Documentation Standards

This document defines the standards and guidelines for maintaining consistent, high-quality documentation across the homelab repository.

## Content Guidelines

### What to Include

- **Application Purpose**: Brief description of what the application does
- **Key Features**: Main functionality and capabilities
- **Access Information**: URLs, ports, and authentication details
- **Essential Configuration**: Only critical config that users need to know
- **Troubleshooting**: Common issues and diagnostic commands
- **Security Notes**: Important security considerations

### What to Omit

- **Detailed Configuration**: Don't duplicate information available in adjacent manifests
- **Complete Code Examples**: Keep only essential patterns, reference official docs for full examples
- **Implementation Details**: Focus on usage, not internal architecture
- **Version-Specific Information**: Avoid hardcoded versions unless critical

### Configuration Documentation

- **Reference Patterns**: Document configuration patterns, not actual values
- **Point to Manifests**: Use phrases like "see `helmrelease.yaml` for complete configuration"
- **Essential Only**: Include only config that users must understand to use the application
- **1Password Integration**: Always document required secret fields and their purpose

## Formatting Standards

### Structure

1. **Title**: Application name as H1
2. **Description**: 1-2 sentence overview
3. **Navigation**: Breadcrumb navigation (if applicable)
4. **Documentation**: External links section
5. **Overview**: What's deployed and key features
6. **Configuration**: Essential config details
7. **Authentication**: How auth works (if applicable)
8. **Security Considerations**: Security notes (if applicable)
9. **Troubleshooting**: Common issues and commands

### Style Guidelines

#### Links

- **External Links**: Use standard markdown format `[Link Text](https://example.com)`
- **Internal Links**: Use relative paths `[text](../path)`
- **Documentation Links**: Always include official documentation link

#### Navigation

- **Format**: `> **Navigation**: [← Back to X](../path)`
- **Placement**: After title, before description
- **Consistency**: Use same format across all READMEs

#### Code Blocks

- **Language Tags**: Always specify language for syntax highlighting
- **Fenced Blocks**: Use triple backticks with language
- **Inline Code**: Use single backticks for commands, file names, keys

#### Emphasis

- **Bold**: UI elements, important terms, section headers in lists
- **Italics**: Notes, optional information, emphasis
- **Code**: Commands, file names, configuration keys, URLs

#### Bullet Points

- **Style**: Use `-` for consistency
- **Indentation**: Use 2 spaces for sub-bullets
- **Format**: Start with capital letter, end without period (unless sentence)

### Heading Hierarchy

- **H1**: Application title only
- **H2**: Main sections (Overview, Configuration, etc.)
- **H3**: Subsections within main sections
- **H4**: Avoid unless absolutely necessary

## Maintenance Guidelines

### When to Update Documentation

- **New Features**: When applications gain new capabilities
- **Breaking Changes**: When configuration or access patterns change
- **Security Updates**: When security considerations change
- **Dependency Updates**: When external dependencies change significantly

### Version References

- **Avoid Hardcoding**: Don't include specific version numbers unless critical
- **Reference Sources**: Point to official documentation for version-specific information
- **Update Patterns**: Document configuration patterns, not specific values

### Breaking Changes

- **Document Impact**: Clearly explain what changed and why
- **Migration Steps**: Provide clear steps for users to adapt
- **Timeline**: Indicate when changes take effect

## Quality Checklist

Before submitting documentation updates:

- [ ] Follows template structure
- [ ] Uses consistent formatting
- [ ] Includes navigation breadcrumbs
- [ ] External links use angle bracket format
- [ ] Code blocks have language tags
- [ ] Troubleshooting section includes common commands
- [ ] Security considerations documented (if applicable)
- [ ] Configuration references patterns, not values
- [ ] Length appropriate for complexity (50-150 lines target)

## Examples

### Good Documentation

- Concise but complete
- References external docs for details
- Includes practical troubleshooting
- Uses consistent formatting

### Poor Documentation

- Duplicates manifest configuration
- Missing troubleshooting information
- Inconsistent formatting
- Too verbose or too brief for complexity
