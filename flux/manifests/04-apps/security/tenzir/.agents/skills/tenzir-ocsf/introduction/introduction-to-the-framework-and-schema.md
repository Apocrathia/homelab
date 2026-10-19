## Introduction to the Framework and Schema

This document describes the Open Cybersecurity Schema Framework (OCSF) and its taxonomy, including the core cybersecurity event schema built with the framework.[^1]

The framework is made up of a set of data types and objects, an attribute dictionary, and the taxonomy.  It is not restricted to the cybersecurity domain nor to events, however the initial focus of the framework has been a schema for cybersecurity events.  A schema browser for the schema can be found at [schema.ocsf.io](https://schema.ocsf.io).

OCSF is agnostic to storage format, data collection and ETL processes.  The core schema is intended to be agnostic to implementations.  The schema framework definition files and the resulting normative schema are written as JSON.

### Personas

There are four personas that are users of the framework and the schema built with the framework.  

The _author_ persona is who creates or extends the schema.  The _producer_ persona is who generates events natively into the schema, or via a translation from another schema.  The _mapper_ persona is who translates or creates events from another source to the schema.  The _analyst_ persona is the end user who searches the data, writes rules or analytics against the schema, or creates reports from the schema.  The analyst may also be considered the _consumer_ persona.

For example, a vendor may write a translation from some external source format into the schema but also extend the schema to accommodate source specific attributes or operations.  The vendor is operating as both the mapper and author personas.  A SOC analyst that collects the data in a SIEM system writes rules against the events and searches events during investigation.  The SOC analyst is operating as the analyst persona.  Finally, a vendor that emits events natively in OCSF form, even if translated, is a data producer.

### Taxonomy Constructs

There are 5 fundamental constructs of the OCSF taxonomy: 

1. Data Types, Attributes and Arrays
2. Event Class
3. Category
4. Profile
5. Extension

The scalar data types are defined on top of primitive data types such as strings, integers, floating point numbers and booleans.  Examples of scalar data types are Timestamp, IP Address, MAC Address, and User Name.

An _attribute_ is a unique identifier name for a specific validatable data type, either scalar or complex.

Complex data types are termed objects.  An _object_ is a collection of contextually related attributes, usually representing an entity, and may include other objects. Each object is also a data type in OCSF.  Examples of object data types are Process, Device, User, Malware and File.

_Arrays_ support any of the data types.  

Most scalar data types have constraints on their valid values or ranges, for example Enum integer types are constrained to a specific set of integer values.  Enum integer typed attributes are an important part of the framework constructs and used in place of strings where possible to ensure consistency.  

Complex data types, or objects, can also be validated based on their particular structure and attribute requirements.  Attribute requirements are discussed in a subsequent section.

Appendix A and B describe the OCSF Guidelines and data types respectively.[^2]

The _attribute dictionary_ of all available attributes, and their types are the building blocks of the framework.  Event classes are particular sets of attributes from the dictionary.

Events in OCSF are represented by _event classes_ which structure a set of attributes that attempt to describe the semantics of the event in detail.  An individual event is an instance of an event class.  Event classes have schema-unique IDs.  Individual events may have globally unique IDs.

Each event class is grouped by category, and has a unique `category_uid` attribute value which is the category identifier.  Categories also have friendly name captions, such as System Activity, Network Activity, Findings, etc.  Event classes are grouped into categories for a number of purposes: a container for a particular event domain, documentation convenience and search, reporting, storage partitioning or access control to name a few.  

_Profiles_ overlay additional related attributes into event classes and objects, allowing for cross-category event class augmentation and filtering.  Event classes register for profiles that when optionally applied, can be mixed into event classes and objects, by a producer or mapper.  For example, System Activity event classes may also include attributes for malware detection or vulnerability information when an endpoint security product is the data source.  Network Activity event classes from a host computer may carry the device, process and user associated with the activity.  A Security Control profile or Host profile can be applied in these cases, respectively.

Finally, _extensions_ allow the schema to be extended using the framework without modification of the core schema.  New attributes, objects, event classes, categories and profiles are all available to extensions.  Existing profiles can be applied to extensions, and new extension profiles can be applied to core event classes and objects as well as to other extensions.

The [schema browser](https://schema.ocsf.io) visually represents the categories, event classes, dictionary, data types, profiles and extensions in a navigable portal. The schema for an event class, and an event example for a class can be generated via menu options of the browser, which also serves as a validation server via the server APIs, whose documentation is also available from the browser.

#### Comparison with MITRE ATT&CK[^3] Framework

The MITRE ATT&CK Framework is widely used in the cybersecurity domain.  While the purpose and content type of the two frameworks are different but complementary, there are some similarities with OCSF’s taxonomy that may be instructive to those with familiarity with ATT&CK.

Categories are similar to Tactics, which have unique IDs.  Event Classes are similar to Techniques, which have unique IDs.  Profiles are similar to Matrices[^4], which have unique names.  Type IDs are similar to Procedures which have unique IDs.  Profiles can filter the Event Classes and Categories similar to how Matrices filter Techniques and Tactics.

Differences from MITRE ATT&CK are that in OCSF, Event Classes are in only one Category, while MITRE ATT&CK Techniques can be part of multiple Tactics.  Similarly MITRE ATT&CK Procedures can be used in multiple Techniques.  MITRE ATT&CK<sup>TM</sup> has Sub-techniques while OCSF does not have Sub-Event Classes.[^5]

OCSF is open and extensible by vendors, and end customers while the content within MITRE ATT&CK<sup>TM</sup> is released by MITRE.
