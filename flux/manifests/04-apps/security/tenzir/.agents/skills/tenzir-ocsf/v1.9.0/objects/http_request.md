# HTTP Request (http_request)

The HTTP Request object represents the attributes of a request made to a web server. It encapsulates the details and metadata associated with an HTTP request, including the request method, headers, URL, query parameters, body content, and other relevant information.

- **Extends**: [Object (object)](object.md)

## Attributes

### `args`

- **Type**: `string_t`
- **Requirement**: optional

The arguments sent along with the HTTP request.

### `body_length`

- **Type**: `integer_t`
- **Requirement**: optional

The actual length of the HTTP request body, in number of bytes, independent of a potentially existing Content-Length header.

### `http_headers`

- **Type**: [`http_header`](http_header.md)
- **Requirement**: recommended

Additional HTTP headers of an HTTP request or response.

### `http_method`

- **Type**: `string_t`
- **Requirement**: recommended

#### Enum values

- `ACL`: `ACL` - The ACL method modifies the access control list of the specified resource.
- `BASELINE-CONTROL`: `Baseline Control` - The BASELINE-CONTROL method places the specified collection resource under baseline control.
- `BIND`: `Bind` - The BIND method adds a binding to the specified collection resource.
- `CHECKIN`: `Check In` - The CHECKIN method creates a new version from a checked-out version-controlled resource.
- `CHECKOUT`: `Check Out` - The CHECKOUT method prepares a version-controlled resource for modification.
- `CONNECT`: `Connect` - The CONNECT method establishes a tunnel to the server identified by the target resource.
- `COPY`: `Copy` - The COPY method duplicates the specified resource.
- `DELETE`: `Delete` - The DELETE method deletes the specified resource.
- `GET`: `Get` - The GET method requests a representation of the specified resource. Requests using GET should only retrieve data.
- `HEAD`: `Head` - The HEAD method asks for a response identical to a GET request, but without the response body.
- `LABEL`: `Label` - The LABEL method adds, sets, or removes labels on a version-controlled resource.
- `LINK`: `Link` - The LINK method establishes one or more links between resources.
- `LOCK`: `Lock` - The LOCK method acquires or refreshes a lock on the specified resource.
- `MERGE`: `Merge` - The MERGE method merges changes from another resource into the specified resource.
- `MKACTIVITY`: `Make Activity` - The MKACTIVITY method creates a new activity resource.
- `MKCALENDAR`: `Make Calendar` - The MKCALENDAR method creates a new calendar collection resource.
- `MKCOL`: `Make Collection` - The MKCOL method creates a new collection resource.
- `MKREDIRECTREF`: `Make Redirect Reference` - The MKREDIRECTREF method creates a new redirect reference resource.
- `MKWORKSPACE`: `Make Workspace` - The MKWORKSPACE method creates a new workspace resource.
- `MOVE`: `Move` - The MOVE method atomically duplicates and deletes the specified resource.
- `OPTIONS`: `Options` - The OPTIONS method describes the communication options for the target resource.
- `ORDERPATCH`: `Order Patch` - The ORDERPATCH method changes the ordering of members in an ordered collection.
- `PATCH`: `Patch` - The PATCH method applies partial modifications to a resource.
- `POST`: `Post` - The POST method submits an entity to the specified resource, often causing a change in state or side effects on the server.
- `PRI`: `PRI` - The PRI method appears in the HTTP/2 connection preface to confirm the protocol.
- `PROPFIND`: `Property Find` - The PROPFIND method retrieves properties defined on the specified resource.
- `PROPPATCH`: `Property Patch` - The PROPPATCH method sets and/or removes properties defined on the specified resource.
- `PUT`: `Put` - The PUT method replaces all current representations of the target resource with the request payload.
- `QUERY`: `Query` - The QUERY method performs a safe query request that can include a request body.
- `REBIND`: `Rebind` - The REBIND method moves a binding from one collection to another.
- `REPORT`: `Report` - The REPORT method retrieves a report about the specified resource.
- `SEARCH`: `Search` - The SEARCH method searches a resource or collection using the request payload.
- `TRACE`: `Trace` - The TRACE method performs a message loop-back test along the path to the target resource.
- `UNBIND`: `Unbind` - The UNBIND method removes a binding from the specified collection resource.
- `UNCHECKOUT`: `Un-Check Out` - The UNCHECKOUT method cancels a checkout and restores the resource to its previous state.
- `UNLINK`: `Unlink` - The UNLINK method removes one or more links between resources.
- `UNLOCK`: `Unlock` - The UNLOCK method releases a lock on the specified resource.
- `UPDATE`: `Update` - The UPDATE method updates a version-controlled resource to match a specified version.
- `UPDATEREDIRECTREF`: `Update Redirect Reference` - The UPDATEREDIRECTREF method changes the target of a redirect reference resource.
- `VERSION-CONTROL`: `Version Control` - The VERSION-CONTROL method places the specified resource under version control.

The HTTP request method indicates the desired action to be performed for a given resource.

### `length`

- **Type**: `integer_t`
- **Requirement**: optional

The length of the entire HTTP request, in number of bytes.

### `referrer`

- **Type**: `string_t`
- **Requirement**: optional

The request header that identifies the address of the previous web page, which is linked to the current web page or resource being requested.

### `uid`

- **Type**: `string_t`
- **Requirement**: optional

The unique identifier of the http request.

### `url`

- **Type**: [`url`](url.md)
- **Requirement**: recommended

The URL object that pertains to the request.

### `user_agent`

- **Type**: `string_t`
- **Requirement**: recommended
- **Observable**: 16

The request header that identifies the operating system and web browser.

### `version`

- **Type**: `string_t`
- **Requirement**: recommended

The Hypertext Transfer Protocol (HTTP) version.

### `x_forwarded_for`

- **Type**: `ip_t`
- **Requirement**: optional

The X-Forwarded-For header identifying the originating IP address(es) of a client connecting to a web server through an HTTP proxy or a load balancer.
