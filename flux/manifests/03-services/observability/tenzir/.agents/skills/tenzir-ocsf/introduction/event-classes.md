## Event Classes

**Events are represented by instances of Event Classes**, which are particular sets of attributes and objects representing a log line or telemetry submission at a point in time.  Event classes have semantics that describe what happened: either a particular activity, disposition or both.  

It is the intent of the schema to allow for the mapping of any raw event to a single event class.  This is achieved by careful design using composition rather than a multiple inheritance approach.  In order to completely capture the information in a rich data source, many attributes may be required.

Unfortunately, not every data source emits the same information for the same observed behavior.  In the interest of consistency, accuracy and precision, the schema event classes specify which dictionary attributes are essential, (recommended or required), while others are optional as not all are needed across different data sources.  Attribute requirements, aside from Classification attributes from the Base Event class, are always within the scope of the event class definition and not tied to the attributes themselves.  

By convention, all event classes extend the Base Event event class.  Attributes of the Base Event class can be present in any event class and are termed Base Attributes.

### Base Event Class Attributes

The Base Event class has required, recommended, and optional attributes that apply to all core schema classes.  The required attributes must be populated for every core schema event.  Optional Base Event class attributes may be included in any event class, along with event class-specific optional attributes.  Individual event classes will include their own required and recommended attributes.

Examples of required base attributes are `class_uid`, `category_uid`, `activity_id`, `severity_id`.

Examples of recommended base attributes are `timezone_offset, status_id, message.`

Examples of optional base attributes are `activity_name`, `start_time`, `end_time`, `count`, `duration`, `unmapped`.

**Each event class has a unique `class_uid` attribute value** which is the event class identifier.  It is a required attribute whose value overrides the nominal Base Event class value of `0`.  Event class friendly names are defined by the schema, optionally populate the `class_name` attribute and are descriptive of the specific class, such as File System Activity or Process Activity.

**Every event class has a `category_uid` attribute value** which indicates which OCSF Category the class belongs to.  An event class may be of only one category.  Category friendly names are defined by the schema, optionally populate the <code>category_name</code> attribute and are descriptive of the specific category the class belongs to, such as System Activity or Network Activity.

**Every event class has an `activity_id` Enum attribute**, constrained to the values appropriate for each event class.  The semantics of the class are further defined by the `activity_id` attribute, such as Open for File System Activity or Launch for Process Activity.  By convention, `activity_id` Enum labels are present tense imperatives.  The Enum label optionally may populate the `activity_name` attribute, which is a sibling to the `activity_id` Enum attribute but as a Classification group attribute, follows the `_name` suffix convention.

### Special Base Attributes

There are a few base attributes that are worth calling out specifically.  These are the `unmapped` attribute, the `raw_data` attribute and the `type_uid` attribute.

While most if not all fields from a raw event can be parsed and tokenized, not all are mapped to the schema.  The fields that are not mapped may be included with the event in the optional `unmapped` attribute.

The `raw_data` optional attribute holds the event data as received from the source.  It is unparsed and represented as a String type.

The `type_uid` required attribute is constructed by the combination of the event class of the event (`class_uid`) and its activity (`activity_id`).  It is unique across the schema hence it has a `_uid` suffix.  The `type_uid` friendly name, `type_name,` is a way of identifying the event in a more readable and complete way.  It too is a combination of the names of the two component parts.  

The value is calculated as: `class_uid` `* 100 + activity_id`.  For example:

`type_uid` = `3001 * 100 + 1 = 300101` 

`type_name` = “Authentication: Logon”

A snippet of a File Activity event example with random values is shown below[^9]:

```json
{
     "activity_id": 11,
     "activity_name": "Decrypt",
     "actor": {},
     "category_name": "System Activity",
     "category_uid": 1,
     "class_name": "File System Activity",
     "class_uid": 1001,
     "device": {},
     "end_time": 1685403212867,
     "file": {},
     "message": "entry queue amateur",
     "metadata": {},
     "observables": [],
     "severity": "Low",
     "severity_id": 2,
     "start_time": 1685403212792,
     "status": "img logs grove",
     "status_detail": "barrier filled clothes",
     "time": 1685403212834,
     "type_name": "File System Activity: Decrypt",
     "type_uid": 100111
}
```

### Constraints

As discussed in a previous section, an event class can have constraints that are more versatile than simple Required attribute requirements.  When at least one of a set of recommended attributes must be present, the class can assert the `at_least_one` constraint:

```json
 "constraints": {
     "at_least_one": [
          "ip",
          "mac",
          "name",
          "hostname"
   ]
 }
```

Or the `just_one` constraint:

```json
"constraints": {
     "just_one": [
          "privileges",
          "group"
     ]
 }
```

### Associations

Attributes within an event class are sometimes associated with each other and in some cases only one of them is present in the event while another may be looked up at processing or storage time.  OCSF denotes this within a class definition via the association construct:

```json
"associations": {
     "actor.user": [
          "src_endpoint"
     ],
     "dst_endpoint": [
          "user"
     ],
     "src_endpoint": [
          "actor.user"
     ],
     "user": [
          "dst_endpoint"
     ]
 }
```

In this example from the Authentication class, the `user` as actor associates with its endpoint, the `src_endpoint` attribute of the class, while the target `user` associates with its endpoint, the `dst_endpoint` of the class.  Note that the associations in this class are bi-directional, which is common, although uni-directional associations are also possible in other situations.

The construct may be useful for automated processing systems where a lookup service is available for an attribute that isn’t or can’t be populated via the source event producer.  In these cases the `processor_time` should be populated at the time of the association, as with other types of enrichments.
