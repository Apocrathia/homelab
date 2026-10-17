## Categories

**A Category organizes event classes that represent a particular domain.**  For example, a category can include event classes for different kinds of events that may be found in an access log, or audit log, or network and system events.  Each category has a unique `category_uid` attribute value which is the category identifier.  Category IDs also have `category_name` friendly name attributes, such as System Activity, Network Activity, Audit, etc.

An example of categories with some of their event classes is shown in the below table.

| **System Activity**       | **Network Activity**  | **Identity & Access Management** | **Findings**     | **Discovery**         | **Application Activity**     |
| ------------------------- | --------------------- | -------------------------------- | ---------------- | --------------------- | ---------------------------- |
| File System Activity      | Network Activity      | Account Change                   | Security Finding | Device Inventory Info | Web Resources Activity       |
| Kernel Extension Activity | HTTP Activity         | Authentication                   |                  | Device Config State   | Application Lifecycle        |
| Kernel Activity           | DNS Activity          | Authorize Session                |                  |                       | API Activity                 |
| Memory Activity           | DHCP Activity         | Entity Management                |                  |                       | Web Resrouce Access Activity |
| Module Activity           | RDP Activity          | User Access Management           |                  |                       |                              |
| Scheduled Job Activity    | SMB Activity          | Group Management                 |                  |                       |                              |
| Process Activity          | SSH Activity          |                                  |                  |                       |                              |
|                           | FTP Activity          |                                  |                  |                       |                              |
|                           | Email Activity        |                                  |                  |                       |                              |
|                           | Network File Activity |                                  |                  |                       |                              |
|                           | Email File Activity   |                                  |                  |                       |                              |
|                           | Email URL Activity    |                                  |                  |                       |                              |


Finding the right granularity of categories is an important modeling topic.  Categorization is weakly structural while event classification is strongly structural (i.e. it defines the particular attributes, their requirements, and specific Enum values for the event class).

Many events produced in a cloud platform can be classified as network activity. Similarly, many host system events include network activity.  The key question to ask is, do the logs from these services and hosts provide the same context or information? Would there be a family of event classes that make sense in a single category?  For example, does the NLB Access log provide context/info similar to a Flow log?  Does network traffic from a host provide similar information to a firewall or router?  Are they structured in the same fashion? Do they share attributes?  Would we obscure the meaning of these logs if we normalize them under the same category? Would the resultant category make sense on its own or will it lose its contextual meaning all together?

Using profiles, some of these overlapping categorical scenarios can be handled without new partially redundant event classes.
