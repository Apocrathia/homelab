## Appendix C - Schema Construction and Extension

The OCSF schema repository can be found at [https://github.com/ocsf/ocsf-schema](https://github.com/ocsf/ocsf-schema).

The repository is structured as follows:

| **File or Folder** | **Purpose**                                                                           |
| ------------------ | :------------------------------------------------------------------------------------ |
| categories.json    | the schema categories are defined and must be present for classes to be in a category |
| dictionary.json    | the schema dictionary is where all attributes must be defined                         |
| version.json       | the schema semver version, every change to the schema requires this file be updated   |
| enums/             | the schema enum definitions, optional if enums are shared                             |
| events/            | the schema event classes                                                              |
| extensions/        | the schema extensions, a similar structure is set per extension                       |
| includes/          | the schema shared files                                                               |
| objects/           | the schema object definitions                                                         |
| profiles/          | the schema profiles                                                                   |

For information and examples about how to add to the schema, see [CONTRIBUTING.md](https://github.com/ocsf/ocsf-schema/blob/a46b6df1d60ad052739caa96c29109e9b233ef82/CONTRIBUTING.md) in the OCSF GitHub.

### Extending the Schema

To extend the schema create a new directory using a unique extension name (e.g. dev)  in the extensions directory. The directory structure is the same as the top level repository structure above, and it may contain the following files and subdirectories, depending on what type of extension is desired:

| **File or Folder** | **Purpose**                                                           |
| ------------------ | --------------------------------------------------------------------- |
| categories.json    | Create to define a new event category to reserve a range of class IDs |
| dictionary.json    | Create to define new attributes                                       |
| events/            | Create to define new event classes                                    |
| objects/           | Create to define new objects                                          |
| profiles/          | Create to define new profiles                                         |

In order to reserve an ID space, and make your extension public, add a UID to your extension name in the OCSF Extensions Registry [here](https://github.com/ocsf/ocsf-schema/blob/main/extensions.md) to avoid collisions with core or other extension schemas.  For example, the dev extension would have a row in the table as follows:

| **Extension Name** | **Type** | **UID** | **Notes**                         |
| ------------------ | -------- | ------- | --------------------------------- |
| Development        | dev      | 999     | The development schema extensions |

New categories and event classes will have their unique IDs offset by the UID.

More information about extending existing schema artifacts can be found at [extending-existing-class.md](https://github.com/ocsf/ocsf-schema/blob/a46b6df1d60ad052739caa96c29109e9b233ef82/doc/extending-existing-class.md).

<!-- Footnotes themselves at the bottom. -->
