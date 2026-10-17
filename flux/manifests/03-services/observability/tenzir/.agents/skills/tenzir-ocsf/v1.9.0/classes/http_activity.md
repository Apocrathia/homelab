# HTTP Activity (http_activity)

HTTP Activity events report HTTP connection and traffic information.

- **Class UID**: `4002`
- **Category**: Network Activity
- **Extends**: [Network (network)](network.md)
- **Profiles**: [Trace](../profiles/trace.md), [Network Proxy](../profiles/network_proxy.md), [Load Balancer](../profiles/load_balancer.md), [AI Operation](../profiles/ai_operation.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Record Integrity](../profiles/record_integrity.md), [Security Control](../profiles/security_control.md)

## Constraints

- **At least one of**: `http_request`, `http_response`

## Inherited attributes

**From Network:**
- `connection_info` (recommended)
- `dst_endpoint` (recommended)
- `proxy` (recommended)
- `src_endpoint` (recommended)
- `traffic` (recommended)

**From Base Event:**
- `category_uid` (required)
- `class_uid` (required)
- `metadata` (required)
- `severity_id` (required)
- `time` (required)
- `type_uid` (required)
- `message` (recommended)
- `observables` (recommended)
- `status` (recommended)
- `status_code` (recommended)
- `status_detail` (recommended)
- `status_id` (recommended)
- `timezone_offset` (recommended)

## Attributes

### `activity_id`

- **Type**: `integer_t`
- **Sibling**: `activity_name`

#### Enum values

- `1`: `Connect` - The CONNECT method establishes a tunnel to the server identified by the target resource.
- `2`: `Delete` - The DELETE method deletes the specified resource.
- `3`: `Get` - The GET method requests a representation of the specified resource. Requests using GET should only retrieve data.
- `4`: `Head` - The HEAD method asks for a response identical to a GET request, but without the response body.
- `5`: `Options` - The OPTIONS method describes the communication options for the target resource.
- `6`: `Post` - The POST method submits an entity to the specified resource, often causing a change in state or side effects on the server.
- `7`: `Put` - The PUT method replaces all current representations of the target resource with the request payload.
- `8`: `Trace` - The TRACE method performs a message loop-back test along the path to the target resource.
- `9`: `Patch` - The PATCH method applies partial modifications to a resource.
- `10`: `ACL` - The ACL method modifies the access control list of the specified resource.
- `11`: `Baseline Control` - The BASELINE-CONTROL method places the specified collection resource under baseline control.
- `12`: `Bind` - The BIND method adds a binding to the specified collection resource.
- `13`: `Check In` - The CHECKIN method creates a new version from a checked-out version-controlled resource.
- `14`: `Check Out` - The CHECKOUT method prepares a version-controlled resource for modification.
- `15`: `Copy` - The COPY method duplicates the specified resource.
- `16`: `Label` - The LABEL method adds, sets, or removes labels on a version-controlled resource.
- `17`: `Link` - The LINK method establishes one or more links between resources.
- `18`: `Lock` - The LOCK method acquires or refreshes a lock on the specified resource.
- `19`: `Merge` - The MERGE method merges changes from another resource into the specified resource.
- `20`: `Make Activity` - The MKACTIVITY method creates a new activity resource.
- `21`: `Make Calendar` - The MKCALENDAR method creates a new calendar collection resource.
- `22`: `Make Collection` - The MKCOL method creates a new collection resource.
- `23`: `Make Redirect Reference` - The MKREDIRECTREF method creates a new redirect reference resource.
- `24`: `Make Workspace` - The MKWORKSPACE method creates a new workspace resource.
- `25`: `Move` - The MOVE method atomically duplicates and deletes the specified resource.
- `26`: `Order Patch` - The ORDERPATCH method changes the ordering of members in an ordered collection.
- `27`: `PRI` - The PRI method appears in the HTTP/2 connection preface to confirm the protocol.
- `28`: `Property Find` - The PROPFIND method retrieves properties defined on the specified resource.
- `29`: `Property Patch` - The PROPPATCH method sets and/or removes properties defined on the specified resource.
- `30`: `Query` - The QUERY method performs a safe query request that can include a request body.
- `31`: `Rebind` - The REBIND method moves a binding from one collection to another.
- `32`: `Report` - The REPORT method retrieves a report about the specified resource.
- `33`: `Search` - The SEARCH method searches a resource or collection using the request payload.
- `34`: `Unbind` - The UNBIND method removes a binding from the specified collection resource.
- `35`: `Un-Check Out` - The UNCHECKOUT method cancels a checkout and restores the resource to its previous state.
- `36`: `Unlink` - The UNLINK method removes one or more links between resources.
- `37`: `Unlock` - The UNLOCK method releases a lock on the specified resource.
- `38`: `Update` - The UPDATE method updates a version-controlled resource to match a specified version.
- `39`: `Update Redirect Reference` - The UPDATEREDIRECTREF method changes the target of a redirect reference resource.
- `40`: `Version Control` - The VERSION-CONTROL method places the specified resource under version control.

The normalized identifier of the activity that triggered the event. Each event class defines its own set of activity values. Use `0` (Unknown) when the activity cannot be determined. Use `99` (Other) when the activity does not match any defined value, in which case `activity_name` must be populated with the source-specific label.

### `file`

- **Type**: [`file`](../objects/file.md)
- **Requirement**: optional
- **Group**: context

The file that is the target of the HTTP activity.

### `http_cookies`

- **Type**: [`http_cookie`](../objects/http_cookie.md)
- **Requirement**: recommended
- **Group**: primary

The cookies object describes details about HTTP cookies

### `http_request`

- **Type**: [`http_request`](../objects/http_request.md)
- **Requirement**: recommended
- **Group**: primary

The HTTP Request Object documents attributes of a request made to a web server.

### `http_response`

- **Type**: [`http_response`](../objects/http_response.md)
- **Requirement**: recommended
- **Group**: primary

The HTTP Response from a web server to a requester.

### `http_status`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary

> **Deprecated since v1.1.0.** Use the `http_response.code` attribute instead.

The Hypertext Transfer Protocol (HTTP) status code returned to the client.
