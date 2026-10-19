## Profiles

**Profiles are overlays on event classes and objects,** effectively a dynamic mix-in class of attributes with their requirements and constraints.  While event classes specialize their category domain, a profile can augment existing event classes with a set of attributes independent of category.  Attributes that must or may occur in any event class are members of the Base Event class.  Attributes that are specialized for selected classes are members of a profile.

Multiple profiles can be added to an event class via an array of profile values in the optional `profiles` attribute of the Base Event class.  This mix-in approach allows for reuse of event classes vs. creating new classes one by one that include the same attributes.  Event classes and instances of events that support the profile can be filtered via the `profiles` attribute across all categories and event classes, forming another dimension of classification.

For example, a `Security Controls` profile that adds MITRE ATT&CK<sup>TM</sup> Attack and Malware objects to System Activity classes avoids having to recreate a new event class, or many classes, with all of the same attributes as the System Activity classes.  A query for events of the class will return all the events, with or without the security information, while a query for just the profile will return events across all event classes that support the `Malware` profile.  A `Host` profile can add `Device`, and `Actor` objects to Network Activity event classes when the network activity log source is a user’s computer.  Note that the `Actor` object includes `Process` and `User` objects, so a Host profile can include all of these when applied.  A Cloud profile could mix-in cloud platform specific information onto Network Activity events.

The `profiles` attribute is an optional array attribute of the Base Event class.  The absence of the `profiles` attribute means no profile attributes are added as would be expected.  Attributes defined with a profile have requirements that cannot be overridden, since profiles are themselves optional; it is assumed that the application of a profile is because those attributes are desired and can be populated.

However some classes, such as System Activity classes, build-in the attributes of a profile, for example the `Host` profile attributes `device` and `actor` are defined in the class.  When a class definition includes the profile attributes, it still registers for that profile in the class definition so as to match any searches across events for that profile. In this case the class defined attribute requirement definitions take precedence.

Core schema profiles for `Security Control`, `Host`, `Cloud`, `Container` and `Linux` (for the Linux extension described later) are shown in the below table with their attributes.

| **Security Control**         | **Host** | **Cloud** | **Container** | **Linux** |
| :--------------------------- | -------- | --------- | ------------- | --------- |
| attacks                      | actor    | api       | container     | group     |
| disposition_id / disposition | device   | cloud     | namespace_pid | euid      |
| malware                      |          |           |               | egid      |
|                              |          |           |               | auid      |

A special `Date/Time` profile adds `Datetime` typed time attributes in every class where there is a `Timestamp` time attribute.  This allows for human readable RFC-3339 strings paired with epoch UTC integer values.

Other profiles could be product oriented, such as Firewall, IDS, VA, DLP etc. if they need to add attributes to existing classes.  They can also be more general, platform oriented, such as for Mac, Linux or Windows environments.

The core schema comes with a Linux profile via the Linux platform extension.

Vendors can add profiles via extensions.  For example, Splunk Technical Add-ons might define a profile that could be added to all events with Splunk’s standard `source`, `sourcetype`, `host` attributes.

### Disposition

The `disposition_id` attribute of the Security Control profile indicates the outcome or state of the event class’ activity at the time of event capture and is an Enum with a standard set of values, such as Blocked, Quarantined, Deleted, Delayed.  

Only event classes that register for the profile may have a `disposition_id` but all have an `activity_id`. A typical use of `disposition_id` is when a security protection product detects a threat and blocks it.  The activity might have been a file open, but if the file was infected, the disposition would be that the file open was blocked.  As of this writing, `disposition_id` is added to core schema classes only via the Security Controls profile.

### Profile Application Examples 

Using example categories and event classes from a preceding section, examples of how profiles might be applied to event classes are shown below.

#### System Activity

The event classes **would** all include the Host profile and **may** include the Security Controls or Cloud profile.

#### Network Activity

The event classes **may** include the Host profile and **may** include the Security Controls or Cloud profile.

#### Identity & Access Management

The event classes **would** include the Host profile, (due to `actor.user`), **may** include the Cloud profile, and **would not** include the Security Control profile.

### Personas and Profiles

The personas called out in an earlier section, producer, author, mapper, analyst, all can consider the profile from a different perspective.

Producers, who can also be authors, can add profiles to their events when the events will include the additional information the profile adds.  For example a vendor may have certain system attributes that are added via an extension profile.  A network vendor that can detect malware would apply the Security Controls profile to their events.  An endpoint security vendor can apply the Host, User and Security Controls profile to network events.

Authors define profiles, and the profiles are applicable to specific classes, objects or categories.

Mappers can add the profile ID and associated attributes to specific events mapped to logs in much the same way producers would apply profiles.

Analysts, e.g. end users, can use the browser to select applicable profiles at the class level.  They can use the profile identifier in queries for hunting, and can use the profile identifiers for analytics and reporting. For example, show all malware alerts across any category and class.
