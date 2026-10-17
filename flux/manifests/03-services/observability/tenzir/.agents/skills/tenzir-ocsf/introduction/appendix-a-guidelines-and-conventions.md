## Appendix A - Guidelines and Conventions

### Guidelines for attribute names

* Attribute names must be a valid UTF-8 sequence. 
* Attribute names must be all lower case. 
* Combine words using underscore. 
* No special characters except underscore. 
* Reserved attributes are prefixed with an underscore.
* Use present tense unless the attribute describes historical information. 
* `activity_id` enum labels should be present tense.  For example, `Delete`.  `disposition_id` enum labels should be past tense.  For example, `Blocked.`
* Use singular and plural names properly to reflect the attribute content.  \
For example, use `events_per_sec` rather than `event_per_sec`. 
* When an attribute represents multiple entities, the attribute name should be pluralized and the value type should be an array.  \
Example: `process.loaded_modules` includes multiple values -- a loaded module names list. 
* Avoid repetition of words where possible.  \
Example: `device.device_ip` should be `device.ip`. 
* Avoid abbreviations when possible.  \
Some exceptions can be made for well-accepted abbreviations. Example: `ip`, or `os`. 
* For vendor extensions to the dictionary, prefix attribute names with a 3-letter moniker in order to avoid name collisions.  Example: `aws_finding, spk_context_ids`.
