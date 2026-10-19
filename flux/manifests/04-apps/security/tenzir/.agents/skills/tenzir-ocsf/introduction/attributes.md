## Attributes

Attributes and the dictionary are the building blocks of a schema.  This section discusses OCSF attribute conventions, requirements, groupings, constraints, and some of the special attributes used in the core cybersecurity schema.

In general, an attribute from the dictionary has the same meaning everywhere it is used in a schema.  Some attributes can have a meaning that is overloaded depending on the event class context where they are used.  In these cases the description of the attribute will be generic and include a ‘see specific usage’ instruction to override its description within the event class context rather than in the dictionary.

### Conventions

OCSF adheres to naming conventions in order to more easily identify attributes with similar semantics.  These conventions take the form of standard suffixes and prefixes.  The standard suffixes are:

```
_id, _ids, _uid, _uuid, _ip, _name, _info, _detail, _time, _dt, _process, _ver, _list
```

### Arrays

Arrays in OCSF represent collections of related scalar values or objects within event classes and objects. They are used when an event may contain multiple instances of the same conceptual data element, such as multiple identifiers, addresses, or related entities. This section defines the conventions, requirements, and naming patterns for array attributes across the schema, including pluralization rules, optional suffix usage, and how arrays are represented at the dictionary, object, and event class levels.

#### Naming Conventions for Arrays

In general, array attributes are named to clearly convey that they represent a collection rather than a single instance. OCSF favors simple, readable naming that maintains semantic clarity and avoids collisions with singular attributes.

##### Plural “s” Suffix (Preferred)

Array attributes **should generally use a plural form ending in “s”** to indicate a collection of elements.

Examples include:

*   `category_ids`
*   `attacks` (MITRE ATT\&CK techniques)

This approach is preferred when pluralization is natural and unambiguous.

##### Optional `_list` Suffix

In cases where pluralization is ambiguous, awkward, or may conflict with another attribute name, the optional `_list` suffix may be used to explicitly indicate an array.

Examples include:

*   `finding_info_list`

The `_list` suffix is not required and should be used only when it improves readability or avoids ambiguity in the schema.

#### Dictionary-Level Representation

Within the attribute dictionary, arrays are defined using the following conventions:

*   The **array attribute name** may use `_list` when necessary to distinguish it from a singular attribute:
    *   `finding_info_list`

*   The **data type of the array elements** is always defined using the **singular form**:
    *   Element type: `finding_info`

*   A **singular attribute may coexist** with an array attribute when each conveys different semantics:
    *   `finding_info` → a single instance
    *   `finding_info_list` → a collection of instances

This approach avoids naming collisions while preserving semantic precision and reuse of data types.

#### Object-Level Representation

When an array contains complex data types, the object representing each array element follows standard object naming rules:

*   The **object name is always singular**, regardless of how many instances appear in the event.
    *   Object type: `finding_info`

This reinforces the conceptual model that each array element represents an individual entity.

#### Event Class and Parent Object Usage

Within an event class or a parent object, array attributes are expressed using the plural form or the `_list` suffix, consistent with the naming rules described above.

Examples include:

*   `finding_info_list`

This convention applies uniformly whether the array attribute appears at the top level of an event or within a nested object.

#### Optional Singular Attributes

In addition to array attributes, OCSF permits the inclusion of a **singular form** of an attribute when it represents a distinct or more specific semantic meaning. This pattern is commonly used when:

*   The singular attribute represents a primary, default, or most relevant instance
*   The array attribute represents the complete set of related instances
*   Both forms improve clarity or usability of the data model

Examples include:

*   `finding_info` → a single, primary instance
*   `finding_info_list` → a collection of instances
``

The singular attribute is optional and should only be defined when it adds meaningful distinction or improves the interpretability of the schema.


#### Unique IDs

Attribute names for classification values that are unique within the schema end with `_uid`.  Schema classification attributes that have the `_uid` suffix are integers, preset by the schema definition (i.e. they must be populated as defined by the schema).

Certain schema-unique attributes that also have a friendly name or caption have the same prefix but by convention use the `_name` suffix.  For example, `class_uid` and `class_name`, or `category_uid` and `category_name`.

Other attributes with the `_uid` suffix convention may be strings or integers, depending on their purpose, although the majority are strings.

A `uid` core attribute is used wherever a producer or mapper populates an identifier for an entity object.  Entity objects also have a corresponding `name` attribute by convention.  Both are of type string (`string_t`).

Attribute names for values that are globally unique end with _uuid.  They do not have friendly names.  For example GUIDs.

#### Enum Attributes

Attributes that are of an Enum integer type end with `_id`.  Enum constant identifiers are integers from a defined set where each has a friendly name label.  Arrays of enum attributes end with `_ids`.

By convention, every Enum type has two common values with integer value 0 for `Unknown` and 99 for `Other`.  

If a source event has missing values that are required by the event class for that event, an `Unknown` value should be set for Enum types which is also the default.  

If a mapped event attribute does not have a defined enumeration value corresponding to a value of the event, `Other` is used which indicates that a sibling string attribute is populated with the custom attribute value.  The sibling string attribute has the same name, minus the suffix.  For example, `activity_id` and `activity`, or `severity_id` and `severity`.

Sibling string attributes are optional, but if the enum value is `Other` (`99`) then the sibling string **must** be populated with the custom label (i.e. not “Other”).

For all defined enumeration integer values, including `Unknown`, the enum label text for the item **may** populate the sibling string attribute.  That is, both the integer value and the string attribute are set.  If the Enum attribute is required, then both the integer attribute and the sibling string attribute **should** be populated. Attribute requirements are discussed in a subsequent section.

### Attribute Requirement Flags

Attributes in the context of an event class have a requirement flag, that depends on the semantics of the event class.  Attributes themselves do not have a requirement flag, only within the context of event classes.[^6]

The requirement flags are:

* Required
* Recommended
* Optional

Event classes are designed so that the most essential attributes are required, to give enough meaning and context to the information reported by the data source.  If an attribute is required, then a consumer of the event can count on the attribute being present, and its value populated.  If a required attribute cannot be populated for a particular event class, a default value is defined by the event class, usually `Unknown`.[^7]  

Recommended attributes should be populated but cannot be in all cases and unlike required attributes are not subject to validation.  They do not have default values. 
Optional attributes may be populated to add context and when data sources emit richer information.
Data onboarders should place more weight on recommended attributes versus optional attributes.

Some event classes may specify constraints on recommended attributes.

### Constraints

A _Constraint_ is a documented rule subject to validation that requires at least one of the specified recommended attributes of a class to be populated.  Constraints are used in classes where there are attributes that cannot be required in all use cases, but in order to have unambiguous meaning, at least one of the attributes in the constraint is required.  Attributes in a constraint must be Recommended.

The two constraints are: `at_least_one` and `just_one`.  These will be explained further in the section on Event Classes.

### Attribute Groups

Attributes are grouped for documentation purposes into _Primary_, _Classification_, _Occurrence_, and _Context_ groups.  Classification and Occurrence groupings are independent of event class and are defined with the attribute in the dictionary.  Primary and Context attributes’ groupings are based on their usage within a given event class.

Each event class has primary attributes, the attributes that are indicative of the event semantics in all use cases.  Primary attributes are typically Required, or Recommended per event class, based on their use in each class.  Primary attributes in the Base Event class apply to all event classes.

Attributes that are important for the taxonomy of the framework are designated as Classification attributes.  The classification attributes are marked as Required as part of the Base Event class.  Their values are nominally `Unknown` or `Other` and will be overridden within specific event classes.

Attributes that are related to time and time ranges are designated as Occurrence attributes.  The occurrence attributes may be marked with any requirement level, depending on their usage within an event class.

Attributes that are used for variations on typical use cases, to enhance the meaning or enrich the content of an event are designated as Context attributes.  The context attributes may be marked with any requirement level, but most often are marked as Optional.

### Timestamp and Datetime Attributes

Representing time values is one of the most important aspects of OCSF.  For an event schema it is even more important.  There are time attributes associated with events that need to be captured in a number of places throughout the schema, for example when a file was opened or when a process started and stopped.  There are also times that are directly related to the event stream, for example event creation, collection, processing, and logging.  The nominal data type for these attributes is `timestamp_t` based on Unix time or number of milliseconds since the Unix epoch.   The `datetime_t` data type represents times in human readable RFC3339 form.

The Date/Time profile when applied adds a sibling attribute of data type `datetime_t `wherever a `timestamp_t `attribute appears in the schema.

The following terms are used below:

Event Producer -- the system (application, services, etc.) that generates events.  Related to the producer persona.

Event Consumer -- the system that receives the events generated by the event producer.  Related to the analyst persona.

Event Processor -- a system that processes and logs, including an ETL chain, the events received by the event consumer.  Related to the mapper and analyst personas.

The core time attributes may be present in all events as they are from the Base Event class.  They are:

* `original_time: string` \
The original event time, as created by the event producer as part of the Metadata object of the Base Event class. The time format is not specified by OCSF and as such is a non-validated string. The time could be UTC time in milliseconds (1659378222123), ISO 8601 (2019-09-07T15:50-04:00), or any other value (12/13/2021 10:12:55 PM).
* `time: timestamp_t` \
The normalized event occurrence time. Normalized time means the original event time `original_time` is corrected for the clock skew of the source if any, and batch submission delay and after it was converted to the OCSF `timestamp_t`.
* `processed_time: timestamp_t` \
The time when the event (or batch of events) was sent by the event processor to the event consumer. The processed time can be used to determine the clock skew at the earliest known event source. Clock skew occurs when the UTC clock time on one computer differs from the UTC clock time on another computer.  It is assumed that the transport latency is very small compared to the clock skew, therefore if the `processed_time` is very close to the `logged_time`, no correction should be made, notwithstanding any known hops.
* `logged_time: timestamp_t` \
The time when the event consumer logged the event. It must be equal or greater than the normalized event occurrence time.
* `modified_time: timestamp_t` \
The time when the event was last updated or enriched.  It must be equal or greater than the normalized event occurrence time. It could be less-than, equal, or greater-than the `logged_time`.
* `start_time/end_time: timestamp_t` \
The start and end event times of the Base Event class are used when the event represents some activity that happened over a time range, for example a vulnerability or virus scan, or a discovery run. The other use-case is event aggregation. Aggregation is a mechanism that allows for a number of events of the same event type to be summarized into one for more efficient processing. For example netflow events.  In this use case, the `count` integer attribute is also populated.

#### Time Zone

The time zone where the event occurred is represented by the `timezone_offset` attribute of data type Integer.  Although time attributes are otherwise UTC except for the pass through attribute original_time, most security use cases benefit from knowing what time of day the event occurred at the event source.

`timezone_offset` is the number of minutes that the reported event time is ahead or behind UTC, in the range -1,080 to +1,080.  It is a recommended attribute of the Base Event class.

### Metadata

Metadata is an object referenced by the required Base Event attribute `metadata`.  As its name implies, the attribute is populated with data outside of the source event.  Some of the attributes of the object are optional, such as `logged_time` and `uid`, while the `version` attribute is required - the schema version for the event.  It is expected that a logging system _may_ assign the `logged_time` and `uid` at storage time.

Metadata attributes such as `modified_time` and `processed_time` are optional.  `modified_time` is populated when an event has been enriched or mutated in some way before analysis or storage.  `processed_time` is populated typically when an event is collected and submitted to a logging system.[^8]

**Version.**  OCSF core schema version uses Semantic Versioning Specification (SemVer), e.g. `0.99.0,` which indicates to consumers of the event which attributes may be found in the event, and what the class and category structure are.  The convention is that the major version, after `1.0.0`, or first part, remains the same while versions of the schema remain backwards compatible with previous versions of the schema and framework.  As new classes, attributes, objects and profiles are added to the schema, the minor version, or second part of the version increases.  The third part is reserved for corrections that don’t break the schema, for example documentation or caption changes.

Extensions, discussed later, have their own versions and can change at their own pace but must remain compatible and consistent with the major version of the core schema that they extend.  The optional `extension` attribute of type Schema Extension carries the version of an extension.

### Observables

Observable is an object referenced by the primary Base Event class array attribute `observables`.  It is populated from other attributes produced or mapped from the source event.  An Observable object surfaces attribute information in one place irrespective of event class, while the security relevant indicators that populate the observable may occur in many places across event classes.  In effect it is an array of summaries of those attributes regardless of where they stem from in the event based on their data type or object type (e.g. `ip_address`, `process`, `file`, etc).

For example, an IP address may populate  multiple attributes: `public_ip, intermediate_ips, ip` (as part of objects Endpoint, Device, Network Proxy, etc.).  An analyst may be interested to know if a particular IP address is present anywhere in any event.  Searching for the IP address value from the Base Event `observables` attribute surfaces any of these events more easily than remembering all of the attributes across all event classes that may have an IP address.

There are three important attributes in the Observable object: `name`, `value`, and `type_id`.  For scalar attributes within an event, all three observable attributes are populated, where the `type_id` declares what the type of attribute is, the `name` is the fully qualified attribute name within the event, and `value` is the value of that attribute.

For complex (object type) attributes, Observable.`name` is the pointer or reference to the attribute, but as an object has more than one value, Observable.`value` is not populated.

```json
"observables": [
     { 
          "name": "actor.process.name",
          "type": "Process Name",
          "type_id": 9,
          "value": "Notepad.exe"
          },
     { 
          "Name": "tls.ja3_hash",
          "Type": "Fingerprint",
          "Type_id": "30"
          },
     { 
          "name": "file.name",
          "type": "File Name",
          "type_id": 7,
          "value": "Notepad.exe"
     }
]
```

### Enrichments

Enrichment is an object referenced by the Base Event array attribute `enrichments`.  An Enrichment object describes additional information added to the event during collection or event processing but before an immutable operation such as storage of the event.  An example would be looking up location data on an IP address, or IOCs against a domain name or file hash.

Because enriching data can be extremely open-ended, the object uses generic string attributes along with a JSON `data` attribute that holds an arbitrary enrichment in a form known to the processing system.  Similar to the Observable object, `name` and `value` attributes are required to point to the event class attribute that is being enriched.  Unlike Observable, there is no predefined set of attributes that are tagged for enrichment, therefore only a recommended `type` attribute is specified (i.e. there is no `type_id` Enum).

Also unlike Observable, which is synchronized with the time of the event, it is assumed that there is some latency between the event time and the time the event is enriched, hence the Base Event class `metadata`.`modified_time` should be populated at the time of enrichment.

For example

```json
"metadata": {
    "logged_time": 1659056959885,
    "modified_time": 1659056959885,
    "processed_time": 1659056959885,
    "sequence": 69,
    "uid": "1310fc5c-0edb-11ed-88fc-0242ac110002",
    "version": "1.0.0"
},
"enrichments": [
     {
          "data": {
               "hash": "0c5ad1e8fe43583e279201cdb1046aea742bae59685e6da24e963a41df987494"
          },
          "name": "ip",
          "provider": "media.defense.gov",
          "type": "IP Address",
          "value": "103.216.221.19"
     },
     {
          "data": {
               "yara_rule": "rule \"wellmail_unique_strings\"{...}"
          },
          "name": "ip",
          "provider": "media.defense.gov",
          "type": "IP Address",
          "value": "103.216.221.19"
     }
]
```
