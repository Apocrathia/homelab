## Extensions

OCSF schemas can be extended by adding new attributes, objects, categories, profiles and event classes.  A schema is the aggregation of core schema entities and extensions.  

Extensions allow a particular vendor or customer to create a new schema or augment an existing schema.[^10]  Extensions can also be used to factor out non-essential schema domains keeping a schema small.  Extensions to the core schema use the framework in the same way as a new schema, optionally creating categories, profiles or event classes from the dictionary.  Extensions can add new attributes to the dictionary, including new objects.  Extended attribute names can be the same as core schema names but this is not a good practice for a number of reasons.  As with categories, event classes and profiles, extensions have unique IDs within the framework as well as versioning.[^11]

As of this writing, two platform extensions augment the core schema: Linux and Windows.  The Linux extension adds a profile, while the Windows extension adds three classes to the System Activity category.

Another use of extensions to the core schema is the development of new schema artifacts, which later may be promoted into the core schema or to a platform extension.  Another use of extensions is to add vendor specific extensions in addition to the core schema.  In this case, a best practice is to prefix the schema artifacts with a short identifier associated with the extension range registered.[^12]  Lastly, as mentioned above, entirely new schemas can be constructed as extensions.

Examples of new experimental categories, new event classes that contain some new attributes and objects are shown in the table below with a `Dev` extension superscript convention.  In the example, extension classes were added to the core Findings category, and three extension categories were added, Policy, Remediation and Diagnostic, with extension classes.

| **Findings**                         | **Policy<sup>Dev</sup>**                   | **Remediation<sup>Dev</sup>**                 | **Diagnostic<sup>Dev</sup>** |
| ------------------------------------ | ------------------------------------------ | --------------------------------------------- | ---------------------------- |
| Incident Creation<sup>Dev</sup>      | Clipboard Content Protection<sup>Dev</sup> | File Remediation<sup>Dev</sup>                | CPU Usage<sup>Dev</sup>      |
| Incident Associate<sup>Dev</sup>     | Compliance<sup>Dev</sup>                   | Folder Remediation<sup>Dev</sup>              | Memory Usage<sup>Dev</sup>   |
| Incident Closure<sup>Dev</sup>       | Compliance Scan<sup>Dev</sup>              | Startup Application Remediation<sup>Dev</sup> | Throughput<sup>Dev</sup>     |
| Incident Update<sup>Dev</sup>        | Content Protection<sup>Dev</sup>           | User Session Remediation<sup>Dev</sup>        |                              |
| Email Delivery Finding<sup>Dev</sup> | Information Protection<sup>Dev</sup>       |                                               |                              |


A brief discussion of how to extend the schema is found in Appendix C.
