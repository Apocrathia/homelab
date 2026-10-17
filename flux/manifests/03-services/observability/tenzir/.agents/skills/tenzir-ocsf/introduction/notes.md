## Notes

[^1]:
     OCSF includes concepts and portions of the ICD Schema, developed by Symantec, a division of Broadcom and has been generalized and made open under Apache 2 license with their permission.

[^2]:
     For the most up-to-date guidelines and data types, refer to the schema browser at [https://schema.ocsf.io](https://schema.ocsf.io).

[^3]:
     MITRE ATT&CK<sup>TM</sup>: https://attack.mitre.org/

[^4]:
     MITRE ATT&CK<sup>TM</sup> Matrix: https://attack.mitre.org/matrices/enterprise/

[^5]:
     The internal source definition of an OCSF schema can be hierarchical but the resulting compiled schema does not expose sub classes.

[^6]:
     Event class validation is enforced via the required attributes, in particular the classification attributes, which by necessity need to be kept to a minimum, as well as attribute data type validation and the event class structure

[^7]:
     Required attributes that cannot be populated due to information missing from a data source must be carried with the event as _unknown_ values - asserting that the information was missing.

[^8]:
     Note that a non-trivial difference between the processed_time and the logged_time in UTC may indicate a clock synchronization problem with the source of the event (but not necessarily the actual source of the event if there  is an intermediate collection system or forwarder).

[^9]:
     Objects have been collapsed to save space.  You can generate full examples with dummy data at [https://schema.ocsf.io/doc/swagger.json](https://schema.ocsf.io/doc/swagger.json) or from within the browser.

[^10]:
     An extension does not need to extend the core schema base class if it is a new schema.

[^11]:
     Reserved identifier ranges are registered within a file in the project GitHub repository.  Extended events should populate the `metadata.version` attribute with the extended schema version.

[^12]:
     The Schema Browser will label extensions with a superscript.
